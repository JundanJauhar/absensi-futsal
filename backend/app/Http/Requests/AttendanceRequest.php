<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'training_session_id' => ['required', 'integer', 'exists:training_sessions,id'],
            'player_id' => ['required', 'integer', 'exists:players,id'],
            'status' => ['sometimes', 'in:present,late,absent,excused'],
            'verification_method' => ['sometimes', 'in:manual,face_recognition'],
            'method' => ['sometimes', 'in:manual,face_recognition'],
            'confidence' => ['nullable', 'numeric', 'between:0,1'],
            'check_in_at' => ['nullable', 'date'],
        ];
    }
}
