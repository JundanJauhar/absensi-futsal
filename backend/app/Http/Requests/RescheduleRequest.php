<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RescheduleRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'new_date' => ['required', 'date'],
            'new_start_time' => ['required', 'date_format:H:i'],
            'new_location' => ['nullable', 'string', 'max:160'],
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }
}
