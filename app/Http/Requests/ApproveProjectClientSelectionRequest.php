<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ApproveProjectClientSelectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Модератор') === true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'montage_user_id' => ['required', 'integer', 'exists:users,id'],
        ];
    }
}
