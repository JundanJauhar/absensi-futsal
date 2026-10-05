<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Player;
use Illuminate\Http\Request;

/**
 * Central face biometric storage so enrollment done on one device
 * (e.g. laptop) is immediately usable on every other device (phone/kiosk).
 */
class FaceController extends Controller
{
    /** All registered descriptors, used by the kiosk for matching. */
    public function index()
    {
        $players = Player::query()
            ->whereNotNull('face_descriptors')
            ->where('status', 'active')
            ->orderBy('jersey_number')
            ->get(['id', 'full_name', 'jersey_number', 'face_descriptors', 'face_registered_at']);

        $data = $players
            ->filter(fn (Player $p) => $p->hasFaceRegistered())
            ->map(fn (Player $p) => [
                'player_id' => $p->id,
                'name' => $p->full_name,
                'jersey' => (string) $p->jersey_number,
                'descriptors' => $p->face_descriptors,
                'registered_at' => $p->face_registered_at?->toISOString(),
            ])
            ->values();

        return response()->json(['success' => true, 'data' => $data, 'meta' => ['count' => $data->count()]]);
    }

    /** Face data for a single player (used by the enrollment page). */
    public function show(Player $player)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'player_id' => $player->id,
                'registered' => $player->hasFaceRegistered(),
                'samples' => is_array($player->face_descriptors) ? count($player->face_descriptors) : 0,
                'photo' => $player->face_photo,
                'registered_at' => $player->face_registered_at?->toISOString(),
            ],
            'meta' => [],
        ]);
    }

    public function store(Request $request, Player $player)
    {
        $validated = $request->validate([
            'descriptors' => ['required', 'array', 'min:1', 'max:30'],
            'descriptors.*' => ['required', 'array', 'size:128'],
            'descriptors.*.*' => ['required', 'numeric'],
            // Compressed JPEG data URL of the frontal capture (~20-60 KB)
            'photo' => ['nullable', 'string', 'max:1500000', 'starts_with:data:image/'],
        ]);

        $descriptors = array_map(
            fn (array $d) => array_map(fn ($v) => round((float) $v, 6), array_values($d)),
            $validated['descriptors']
        );

        $update = [
            'face_descriptors' => $descriptors,
            'face_registered_at' => now(),
        ];
        if (!empty($validated['photo'])) {
            $update['face_photo'] = $validated['photo'];
        }

        $player->forceFill($update)->save();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'player.face_registered',
            'entity_type' => Player::class,
            'entity_id' => $player->id,
            'old_values' => null,
            'new_values' => ['samples' => count($descriptors), 'photo' => !empty($validated['photo'])],
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'player_id' => $player->id,
                'status' => 'registered',
                'samples' => count($descriptors),
                'photo' => $player->face_photo,
                'registered_at' => $player->face_registered_at?->toISOString(),
            ],
            'meta' => [],
        ]);
    }

    public function destroy(Request $request, Player $player)
    {
        $player->forceFill([
            'face_descriptors' => null,
            'face_photo' => null,
            'face_registered_at' => null,
        ])->save();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'player.face_unregistered',
            'entity_type' => Player::class,
            'entity_id' => $player->id,
            'old_values' => null,
            'new_values' => null,
        ]);

        return response()->json([
            'success' => true,
            'data' => ['player_id' => $player->id, 'status' => 'unregistered'],
            'meta' => [],
        ]);
    }
}
