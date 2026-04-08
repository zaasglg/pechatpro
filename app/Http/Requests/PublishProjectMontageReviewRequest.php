<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PublishProjectMontageReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Модератор') === true;
    }

    public function rules(): array
    {
        return [];
    }
}
