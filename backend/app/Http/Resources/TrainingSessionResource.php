<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TrainingSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title ?? 'Latihan Futsal',
            'training_schedule_id' => $this->training_schedule_id,
            'training_date' => $this->training_date?->toDateString(),
            'start_time' => substr((string) $this->start_time, 0, 5),
            'end_time' => substr((string) $this->end_time, 0, 5),
            'location' => $this->location,
            'status' => $this->status,
            'attendance_state' => $this->attendance_state,
            'attendance_open_at' => $this->attendance_open_at?->toIso8601String(),
            'attendance_close_at' => $this->attendance_close_at?->toIso8601String(),
            'effective_open_at' => $this->effective_open_at?->toIso8601String(),
            'effective_close_at' => $this->effective_close_at?->toIso8601String(),
            'attendances_count' => $this->attendances()->count(),
            'attendances' => AttendanceResource::collection($this->whenLoaded('attendances')),
            'reschedules' => $this->whenLoaded('reschedules'),
        ];
    }
}
