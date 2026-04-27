<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class ReplaceProjectMontageAssetRequest extends FormRequest
{
    /**
     * @var array<int, string>
     */
    private const ALLOWED_IMAGE_EXTENSIONS = [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'bmp',
        'svg',
        'avif',
        'heic',
        'heif',
        'tif',
        'tiff',
        'raf',
        'arw',
        'cr2',
        'cr3',
        'dng',
        'nef',
        'nrw',
        'orf',
        'pef',
        'rw2',
        'sr2',
        'srf',
        'srw',
        'x3f',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'image' => [
                'required',
                File::types(self::ALLOWED_IMAGE_EXTENSIONS)
                    ->max('50mb'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Выберите изображение для замены.',
            'image.mimes' => 'Поддерживаются JPG, PNG, WEBP, SVG и RAW-форматы (RAF, CR2, CR3, DNG, NEF и другие).',
            'image.mimetypes' => 'Поддерживаются JPG, PNG, WEBP, SVG и RAW-форматы (RAF, CR2, CR3, DNG, NEF и другие).',
            'image.max' => 'Размер файла не должен превышать 50 МБ.',
        ];
    }
}
