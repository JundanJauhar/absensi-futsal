<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\PlayerController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\TrainingController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\EvaluationController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\FaceController;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json([
        'success' => true,
        'data' => ['service' => 'laravel-api', 'status' => 'healthy'],
        'meta' => [],
    ]));
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        // Kiosk & Active Session endpoints (kiosk runs on a logged-in device)
        Route::get('/training/sessions/active', [TrainingController::class, 'active']);
        Route::post('/kiosk/attendance', [AttendanceController::class, 'store']);

        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::apiResource('players', PlayerController::class);

        // Face biometrics (shared across laptop / phone / kiosk)
        Route::get('/face/descriptors', [FaceController::class, 'index']);
        Route::get('/players/{player}/face', [FaceController::class, 'show']);
        Route::post('/players/{player}/face/register', [FaceController::class, 'store']);
        Route::delete('/players/{player}/face', [FaceController::class, 'destroy']);
        Route::get('/training/upcoming', [TrainingController::class, 'upcoming']);
        Route::post('/training/sessions/{session}/open-attendance', [TrainingController::class, 'openAttendance']);
        Route::post('/training/sessions/{session}/close-attendance', [TrainingController::class, 'closeAttendance']);
        Route::post('/training/sessions/{session}/reopen-attendance', [TrainingController::class, 'reopenAttendance']);
        Route::apiResource('training/sessions', TrainingController::class)->only(['index', 'store', 'show']);
        Route::get('/attendance/session/{training_session}', [AttendanceController::class, 'index']);
        Route::apiResource('attendance', AttendanceController::class)->only(['index', 'store', 'show']);
        Route::post('/attendance/recognize', [AttendanceController::class, 'store']);
        Route::apiResource('evaluations', EvaluationController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::get('/players/{player}/evaluations', [EvaluationController::class, 'playerEvaluations']);
        Route::get('/players/{player}/development', [EvaluationController::class, 'development']);
        Route::post('/training/sessions/{session}/reschedule', [TrainingController::class, 'reschedule']);
        Route::get('/players/{player}/audit-logs', function (\App\Models\Player $player) {
            return response()->json([
                'success' => true,
                'data' => \App\Models\AuditLog::where('entity_type', \App\Models\Player::class)
                    ->where('entity_id', $player->id)->latest()->get(),
                'meta' => [],
            ]);
        });
    });
});
