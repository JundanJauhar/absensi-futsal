<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_players(): void
    {
        $this->getJson('/api/v1/players')->assertUnauthorized();
    }

    public function test_coach_can_list_players(): void
    {
        $user = User::factory()->create();
        Player::factory()->create(['full_name' => 'Pemain Uji']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/players')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment(['full_name' => 'Pemain Uji']);
    }

    public function test_active_jersey_number_must_be_unique(): void
    {
        $user = User::factory()->create();
        Player::factory()->create(['jersey_number' => 10, 'status' => 'active']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/players', [
                'full_name' => 'Pemain Kedua',
                'jersey_number' => 10,
                'primary_position' => 'pivot',
                'joined_at' => '2026-10-01',
                'status' => 'active',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('jersey_number');
    }

    public function test_coach_can_update_and_delete_player(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/players/{$player->id}", ['full_name' => 'Nama Baru', 'jersey_number' => 30, 'primary_position' => 'anchor', 'joined_at' => '2026-10-01', 'status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.full_name', 'Nama Baru');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/players/{$player->id}")
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
