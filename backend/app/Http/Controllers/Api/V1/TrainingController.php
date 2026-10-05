<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RescheduleRequest;
use App\Http\Requests\TrainingSessionRequest;
use App\Http\Resources\TrainingSessionResource;
use App\Models\TrainingReschedule;
use App\Models\TrainingSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrainingController extends Controller
{
    public function active(Request $request)
    {
        $now = now();
        $session = null;

        // 1. Explicit session requested by ID
        if ($request->filled('session_id')) {
            $session = TrainingSession::with(['attendances.player', 'reschedules'])
                ->find($request->session_id);
        }

        // 2. Auto-resolve active session
        if (!$session) {
            // Find explicitly active session
            $session = TrainingSession::with(['attendances.player', 'reschedules'])
                ->where('status', 'active')
                ->first();
        }

        if (!$session) {
            // Find today's session that is within attendance window or scheduled today
            $todaySessions = TrainingSession::with(['attendances.player', 'reschedules'])
                ->where('status', 'scheduled')
                ->whereDate('training_date', $now->toDateString())
                ->orderBy('start_time')
                ->get();

            // First check if any is currently within its attendance window
            foreach ($todaySessions as $s) {
                if ($s->attendance_state === 'ACTIVE_ATTENDANCE') {
                    $session = $s;
                    break;
                }
            }

            // Otherwise, take the next upcoming or first session of today
            if (!$session && $todaySessions->isNotEmpty()) {
                $session = $todaySessions->first();
            }
        }

        if (!$session) {
            // Check next upcoming scheduled session
            $session = TrainingSession::with(['attendances.player', 'reschedules'])
                ->whereIn('status', ['scheduled', 'active'])
                ->whereDate('training_date', '>=', $now->toDateString())
                ->orderBy('training_date')
                ->orderBy('start_time')
                ->first();
        }

        $totalPlayers = \App\Models\Player::where('status', 'active')->count();
        if ($totalPlayers === 0) {
            $totalPlayers = \App\Models\Player::count();
        }

        $availableSessions = TrainingSession::orderByDesc('training_date')
            ->orderByDesc('start_time')
            ->take(10)
            ->get(['id', 'title', 'training_date', 'start_time', 'end_time', 'location', 'status']);

        if (!$session) {
            return response()->json([
                'success' => true,
                'data' => [
                    'state' => 'NO_ACTIVE_SESSION',
                    'server_time' => $now->toIso8601String(),
                    'timezone' => config('app.timezone'),
                    'session' => null,
                    'stats' => [
                        'total_players' => $totalPlayers,
                        'attended_count' => 0,
                        'attended_player_ids' => [],
                    ],
                    'available_sessions' => $availableSessions,
                ],
                'meta' => [],
            ]);
        }

        $attendedPlayerIds = $session->attendances->pluck('player_id')->values()->all();

        return response()->json([
            'success' => true,
            'data' => [
                'state' => $session->attendance_state,
                'server_time' => $now->toIso8601String(),
                'timezone' => config('app.timezone'),
                'session' => new TrainingSessionResource($session),
                'stats' => [
                    'total_players' => $totalPlayers,
                    'attended_count' => count($attendedPlayerIds),
                    'attended_player_ids' => $attendedPlayerIds,
                ],
                'available_sessions' => $availableSessions,
            ],
            'meta' => [],
        ]);
    }

    public function openAttendance(TrainingSession $session)
    {
        $session->update([
            'status' => 'active',
            'attendance_open_at' => now(),
            'attendance_close_at' => null,
        ]);
        return response()->json([
            'success' => true,
            'message' => 'Sesi absensi berhasil dibuka.',
            'data' => new TrainingSessionResource($session->fresh(['attendances.player', 'reschedules'])),
            'meta' => [],
        ]);
    }

    public function closeAttendance(TrainingSession $session)
    {
        $session->update([
            'status' => 'completed',
            'attendance_close_at' => now(),
        ]);
        return response()->json([
            'success' => true,
            'message' => 'Sesi absensi berhasil ditutup.',
            'data' => new TrainingSessionResource($session->fresh(['attendances.player', 'reschedules'])),
            'meta' => [],
        ]);
    }

    public function reopenAttendance(TrainingSession $session)
    {
        // Reopening preserves ALL existing attendance records
        $session->update([
            'status' => 'active',
            'attendance_close_at' => null,
        ]);
        return response()->json([
            'success' => true,
            'message' => 'Sesi absensi dibuka kembali tanpa menghapus data sebelumnya.',
            'data' => new TrainingSessionResource($session->fresh(['attendances.player', 'reschedules'])),
            'meta' => [],
        ]);
    }

    public function upcoming()
    {
        $session = TrainingSession::with('reschedules')
            ->where('status', 'scheduled')
            ->whereDate('training_date', '>=', now()->toDateString())
            ->orderBy('training_date')
            ->orderBy('start_time')
            ->first();
        return response()->json(['success' => true, 'data' => $session ? new TrainingSessionResource($session) : null, 'meta' => []]);
    }

    public function index(Request $request)
    {
        $sessions = TrainingSession::with('reschedules')->orderByDesc('training_date')->orderByDesc('start_time')->paginate(min($request->integer('per_page', 20), 100));
        return TrainingSessionResource::collection($sessions)->additional(['success' => true]);
    }

    public function store(TrainingSessionRequest $request)
    {
        $session = TrainingSession::create($request->validated());
        return (new TrainingSessionResource($session))->additional(['success' => true])->response()->setStatusCode(201);
    }

    public function show(TrainingSession $session): TrainingSessionResource
    {
        return new TrainingSessionResource($session->load('reschedules'));
    }

    public function reschedule(RescheduleRequest $request, TrainingSession $session)
    {
        $data = $request->validated();
        $updated = DB::transaction(function () use ($request, $session, $data) {
            $reschedule = TrainingReschedule::create([
                'training_session_id' => $session->id,
                'original_date' => $session->training_date,
                'original_start_time' => $session->start_time,
                'new_date' => $data['new_date'],
                'new_start_time' => $data['new_start_time'],
                'new_location' => $data['new_location'] ?? $session->location,
                'reason' => $data['reason'],
                'changed_by' => $request->user()->id,
                'changed_at' => now(),
            ]);
            $session->update(['training_date' => $data['new_date'], 'start_time' => $data['new_start_time'], 'location' => $data['new_location'] ?? $session->location]);
            return $session->load('reschedules');
        });
        return new TrainingSessionResource($updated);
    }
}
