<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceEvaluationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_attendance_creation_is_idempotent_for_a_player_and_session(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create();
        $session = TrainingSession::create([
            'training_date' => now()->toDateString(), 'start_time' => '16:00',
            'end_time' => '18:00', 'location' => 'Lapangan Uji', 'status' => 'scheduled',
        ]);
        $payload = ['player_id' => $player->id, 'training_session_id' => $session->id, 'method' => 'manual'];

        // 1. First request -> 201 Created with status 'recorded'
        $first = $this->actingAs($user, 'sanctum')->postJson('/api/v1/attendance', $payload);
        $first->assertCreated()
            ->assertJsonPath('status', 'recorded')
            ->assertJsonPath('already_recorded', false);
        $firstCheckInAt = $first->json('recorded_at');

        // 2. Duplicate request -> 200 OK with status 'already_recorded'
        $second = $this->actingAs($user, 'sanctum')->postJson('/api/v1/attendance', $payload);
        $second->assertOk()
            ->assertJsonPath('status', 'already_recorded')
            ->assertJsonPath('already_recorded', true)
            ->assertJsonPath('recorded_at', $firstCheckInAt);

        // 3. Kiosk route duplicate request -> 200 OK with status 'already_recorded'
        $kiosk = $this->postJson('/api/v1/kiosk/attendance', $payload);
        $kiosk->assertOk()
            ->assertJsonPath('status', 'already_recorded')
            ->assertJsonPath('already_recorded', true);

        // Database must only have 1 single record
        $this->assertDatabaseCount('attendances', 1);
    }

    public function test_evaluation_crud_and_development_history(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create();
        $payload = [
            'player_id' => $player->id, 'notes' => 'Bagus',
            'scores' => ['technical' => 7, 'physical' => 8],
        ];

        $created = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/evaluations', $payload)->assertCreated();
        $id = $created->json('data.id');
        $this->actingAs($user, 'sanctum')->putJson("/api/v1/evaluations/{$id}", [
            'notes' => 'Meningkat', 'scores' => ['technical' => 9],
        ])->assertOk();
        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/players/{$player->id}/development")
            ->assertOk()->assertJsonFragment(['skill' => 'technical', 'latest_score' => 9]);
        $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/evaluations/{$id}")->assertOk();
        $this->assertDatabaseMissing('player_evaluations', ['id' => $id]);
    }
}
