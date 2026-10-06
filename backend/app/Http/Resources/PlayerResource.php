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
            'class_grade' => $this->class_grade ?? '10',
            'profile_photo' => $this->resolveProfilePhoto(),
            'primary_position' => $this->primary_position,
            'secondary_position' => $this->secondary_position,
            'primary_kick' => $this->primary_kick ?? 'right',
            'joined_at' => $this->joined_at?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'face_registered' => $this->hasFaceRegistered(),
            'face_registered_at' => $this->face_registered_at?->toISOString(),
            'face_samples' => is_array($this->face_descriptors) ? count($this->face_descriptors) : 0,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Avatar priority: frontal face-enrollment photo, then uploaded photo.
     */
    private function resolveProfilePhoto(): ?string
    {
        if (!empty($this->face_photo)) {
            return $this->face_photo;
        }
        if (!$this->profile_photo) {
            return null;
        }
        if (str_starts_with($this->profile_photo, 'data:') || str_starts_with($this->profile_photo, 'http')) {
            return $this->profile_photo;
        }
        return asset('storage/'.$this->profile_photo);
    }
}
