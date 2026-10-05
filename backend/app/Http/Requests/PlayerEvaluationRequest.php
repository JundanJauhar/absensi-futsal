<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PlayerEvaluationRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'player_id' => [$this->isMethod('post') ? 'required' : 'sometimes', 'integer', 'exists:players,id'],
            'evaluated_at' => ['sometimes', 'date'],
            'notes' => ['nullable', 'string'],
            'scores' => ['sometimes', 'array'],
            'scores.*' => ['numeric', 'between:0,100'],
            'skill_scores' => ['sometimes', 'array'],
            'skill_scores.*.skill' => ['required_with:skill_scores', 'string', 'max:100'],
            'skill_scores.*.score' => ['required_with:skill_scores', 'numeric', 'between:0,100'],
            'skill_scores.*.comment' => ['nullable', 'string'],
        ];
    }
}
