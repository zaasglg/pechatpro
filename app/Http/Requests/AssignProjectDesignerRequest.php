<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignProjectDesignerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Модератор') === true;
    }

    public function rules(): array
    {
        return [
            'designer_user_id' => ['required', 'integer', 'exists:users,id'],
        ];
    }
}
