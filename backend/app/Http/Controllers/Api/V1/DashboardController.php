<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\TrainingSession;
use App\Models\Attendance;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        $activePlayers = Player::where('status', 'active')->count();
        $totalPlayers = Player::count();
        
        $nextTraining = TrainingSession::where('status', 'scheduled')
            ->where('training_date', '>=', now()->toDateString())
            ->orderBy('training_date')
            ->orderBy('start_time')
            ->first();

        $recentSessions = TrainingSession::where('status', 'completed')
            ->latest('training_date')
            ->take(5)
            ->pluck('id');

        $attendanceRate = 0;
        if ($recentSessions->isNotEmpty() && $activePlayers > 0) {
            $presentCount = Attendance::whereIn('training_session_id', $recentSessions)
                ->whereIn('status', ['present', 'late'])
                ->count();
            $maxPossible = $recentSessions->count() * $activePlayers;
            $attendanceRate = $maxPossible > 0 ? round(($presentCount / $maxPossible) * 100, 1) : 0;
        }

        $pendingEvaluations = Player::where('status', 'active')
            ->whereDoesntHave('evaluations', function ($q) {
                $q->where('evaluated_at', '>=', now()->subDays(30));
            })
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'active_players' => $activePlayers,
                'total_players' => $totalPlayers,
                'attendance_rate' => $attendanceRate,
                'pending_evaluations' => $pendingEvaluations,
                'registered_faces' => 0,
                'next_training' => $nextTraining ? [
                    'id' => $nextTraining->id,
                    'date' => $nextTraining->training_date ? $nextTraining->training_date->format('Y-m-d') : null,
                    'start_time' => $nextTraining->start_time,
                    'end_time' => $nextTraining->end_time,
                    'location' => $nextTraining->location,
                    'status' => $nextTraining->status,
                ] : null,
            ],
            'meta' => [],
        ]);
    }
}
