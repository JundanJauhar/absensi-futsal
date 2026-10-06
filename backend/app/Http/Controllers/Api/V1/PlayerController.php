<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlayerRequest;
use App\Http\Resources\PlayerResource;
use App\Models\Player;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PlayerController extends Controller
{
    public function index(Request $request)
    {
        $players = Player::query()
            ->when($request->filled('search'), fn ($query) => $query->where('full_name', 'like', '%'.$request->string('search').'%'))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('position'), fn ($query) => $query->where('primary_position', $request->string('position')))
            ->when($request->filled('class_grade'), fn ($query) => $query->where('class_grade', $request->string('class_grade')))
            ->orderBy('jersey_number')
            ->paginate(min($request->integer('per_page', 24), 100));

        return PlayerResource::collection($players)->additional([
            'success' => true,
        ]);
    }

    public function store(PlayerRequest $request)
    {
        $data = $request->safe()->except(['profile_photo']);
        if ($request->hasFile('profile_photo')) {
            $data['profile_photo'] = $request->file('profile_photo')->store('players', 'public');
        }

        $player = Player::create($data);
        $this->audit('player.created', $player, null, $player->getAttributes());

        return (new PlayerResource($player))
            ->additional(['success' => true])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Player $player): PlayerResource
    {
        return new PlayerResource($player);
    }

    public function update(PlayerRequest $request, Player $player): PlayerResource
    {
        $oldValues = $player->only($player->getFillable());
        $data = $request->safe()->except(['profile_photo']);
        if ($request->hasFile('profile_photo')) {
            if ($player->profile_photo) {
                Storage::disk('public')->delete($player->profile_photo);
            }
            $data['profile_photo'] = $request->file('profile_photo')->store('players', 'public');
            // Manual upload overrides the biometric avatar
            $data['face_photo'] = null;
        }
        $player->update($data);
        $this->audit('player.updated', $player, $oldValues, $player->fresh()->only($player->getFillable()));
        return new PlayerResource($player->fresh());
    }

    public function destroy(Player $player)
    {
        $oldValues = $player->only($player->getFillable());
        if ($player->profile_photo) {
            Storage::disk('public')->delete($player->profile_photo);
        }
        $player->delete();
        $this->audit('player.deleted', $player, $oldValues, null);
        return response()->json(['success' => true, 'data' => null, 'meta' => []]);
    }

    private function audit(string $action, Player $player, ?array $oldValues, ?array $newValues): void
    {
        $strip = fn (?array $values) => $values === null
            ? null
            : array_diff_key($values, array_flip(['face_descriptors', 'face_photo']));

        AuditLog::create([
            'user_id' => request()->user()?->id,
            'action' => $action,
            'entity_type' => Player::class,
            'entity_id' => $player->id,
            'old_values' => $strip($oldValues),
            'new_values' => $strip($newValues),
        ]);
    }
}
