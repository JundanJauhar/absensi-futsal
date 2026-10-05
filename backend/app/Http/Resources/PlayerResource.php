<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'jersey_number' => $this->jersey_number,
            'profile_photo' => $this->profile_photo ? asset('storage/'.$this->profile_photo) : null,
            'primary_position' => $this->primary_position,
            'secondary_position' => $this->secondary_position,
            'joined_at' => $this->joined_at?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'face_registered' => false,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
