<?php

namespace Tests\Feature;

use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_coach_can_list_upcoming_training(): void
    {
        $user = User::factory()->create();
        TrainingSession::create(['training_date' => '2026-10-10', 'start_time' => '16:00', 'end_time' => '18:00', 'location' => 'Lapangan Uji', 'status' => 'scheduled']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/training/upcoming')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.training_date', '2026-10-10');
    }

    public function test_coach_can_create_and_reschedule_training(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/training/sessions', [
            'training_date' => '2026-10-12',
            'start_time' => '16:00',
            'end_time' => '18:00',
            'location' => 'Lapangan Uji',
            'status' => 'scheduled',
        ])->assertCreated();

        $id = $response->json('data.id');
        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/training/sessions/{$id}/reschedule", [
                'new_date' => '2026-10-13',
                'new_start_time' => '17:00',
                'new_location' => 'Lapangan Baru',
                'reason' => 'Agenda tim berubah',
            ])
            ->assertOk()
            ->assertJsonPath('data.training_date', '2026-10-13')
            ->assertJsonPath('data.reschedules.0.reason', 'Agenda tim berubah');
    }
}
