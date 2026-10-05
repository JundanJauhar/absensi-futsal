<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'player' => $this->whenLoaded('player'),
            'training_session' => $this->whenLoaded('trainingSession'),
        ];
    }
}
