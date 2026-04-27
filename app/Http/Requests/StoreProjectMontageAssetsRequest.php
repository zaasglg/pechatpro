<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreProjectMontageAssetsRequest extends FormRequest
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
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'min:1', 'max:30'],
            'images.*' => [
                'required',
                File::types(self::ALLOWED_IMAGE_EXTENSIONS)
                    ->max('50mb'),
            ],
        ];
    }
}
