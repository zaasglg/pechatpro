<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReplaceProjectMontageAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Выберите изображение для замены.',
            'image.image' => 'Нужно загрузить изображение в формате JPG, PNG или WEBP.',
            'image.mimes' => 'Поддерживаются только файлы JPG, PNG и WEBP.',
            'image.max' => 'Размер файла не должен превышать 10 МБ.',
        ];
    }
}
