<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FaceAuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_with_username_case_insensitively(): void
    {
        $this->postJson('/api/v1/auth/login', ['username' => 'ukm futsal maspa', 'password' => 'maspapunya'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token']]);

        $this->postJson('/api/v1/auth/login', ['username' => 'UKM FUTSAL MASPA', 'password' => 'salah'])
            ->assertStatus(422);

        $this->postJson('/api/v1/auth/login', ['email' => 'coach@ftms.test', 'password' => 'password'])
            ->assertStatus(422);
    }

    public function test_data_endpoints_require_login(): void
    {
        $this->getJson('/api/v1/players')->assertUnauthorized();
        $this->getJson('/api/v1/face/descriptors')->assertUnauthorized();
        $this->getJson('/api/v1/training/sessions/active')->assertUnauthorized();
        $this->postJson('/api/v1/kiosk/attendance', [])->assertUnauthorized();
    }

    public function test_face_registration_is_shared_and_sets_avatar(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create();
        $descriptor = array_fill(0, 128, 0.123456789);
        $photo = 'data:image/jpeg;base64,'.base64_encode('fake-jpeg');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/players/{$player->id}/face/register", [
                'descriptors' => [$descriptor, $descriptor],
                'photo' => $photo,
            ])
            ->assertOk()
            ->assertJsonPath('data.samples', 2);

        $this->getJson("/api/v1/players/{$player->id}")
            ->assertJsonPath('data.face_registered', true)
            ->assertJsonPath('data.face_samples', 2)
            ->assertJsonPath('data.profile_photo', $photo);

        $this->getJson('/api/v1/face/descriptors')
            ->assertOk()
            ->assertJsonPath('data.0.player_id', $player->id)
            ->assertJsonCount(128, 'data.0.descriptors.0');

        $this->deleteJson("/api/v1/players/{$player->id}/face")->assertOk();
        $this->getJson("/api/v1/players/{$player->id}")
            ->assertJsonPath('data.face_registered', false);
    }

    public function test_face_registration_rejects_invalid_descriptors(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/players/{$player->id}/face/register", ['descriptors' => [[0.1, 0.2]]])
            ->assertStatus(422);
    }
}
