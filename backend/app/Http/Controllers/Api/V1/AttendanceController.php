<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $records = Attendance::with(['player', 'trainingSession'])
            ->when($request->filled('training_session_id'), fn ($q) => $q->where('training_session_id', $request->integer('training_session_id')))
            ->when($request->filled('player_id'), fn ($q) => $q->where('player_id', $request->integer('player_id')))
            ->orderBy('check_in_at')->get();

        return AttendanceResource::collection($records)->additional(['success' => true]);
    }

    public function store(AttendanceRequest $request)
    {
        $data = $request->validated();
        $data['verification_method'] = $data['verification_method'] ?? $data['method'] ?? 'manual';
        unset($data['method']);
        $data['check_in_at'] = $data['check_in_at'] ?? now();

        $record = DB::transaction(function () use ($data) {
            return Attendance::firstOrCreate(
                ['training_session_id' => $data['training_session_id'], 'player_id' => $data['player_id']],
                $data
            );
        });

        $wasCreated = $record->wasRecentlyCreated;
        $httpCode = $wasCreated ? 201 : 200;
        $recordLoaded = $record->load(['player', 'trainingSession']);

        return (new AttendanceResource($recordLoaded))
            ->additional([
                'success' => true,
                'status' => $wasCreated ? 'recorded' : 'already_recorded',
                'already_recorded' => !$wasCreated,
                'message' => $wasCreated ? 'Kehadiran berhasil dicatat.' : 'Pemain sudah tercatat hadir pada sesi ini.',
                'recorded_at' => $record->check_in_at?->toIso8601String(),
                'player' => $recordLoaded->player,
            ])
            ->response()->setStatusCode($httpCode);
    }

    public function show(Attendance $attendance): AttendanceResource
    {
        return new AttendanceResource($attendance->load(['player', 'trainingSession']));
    }
}
