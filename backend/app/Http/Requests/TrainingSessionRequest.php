<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TrainingSessionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'training_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'location' => ['required', 'string', 'max:160'],
            'status' => ['sometimes', Rule::in(['scheduled', 'completed', 'cancelled'])],
            'training_schedule_id' => ['nullable', 'exists:training_schedules,id'],
        ];
    }
}
