<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $player = $this->route('player');

        return [
            'full_name' => ['required', 'string', 'min:2', 'max:120'],
            'jersey_number' => [
                'required',
                'integer',
                'between:0,99',
                Rule::unique('players', 'jersey_number')
                    ->where(fn ($query) => $query->where('status', 'active'))
                    ->ignore($player?->id),
            ],
            'profile_photo' => ['nullable', 'image', 'max:5120'],
            'primary_position' => ['required', Rule::in(['goalkeeper', 'anchor', 'flank', 'pivot'])],
            'secondary_position' => ['nullable', Rule::in(['goalkeeper', 'anchor', 'flank', 'pivot'])],
            'joined_at' => ['required', 'date'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
