<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Фотограф') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'class_name' => ['required', Rule::in(Project::CLASS_OPTIONS)],
            'album_type' => ['required', Rule::in(Project::ALBUM_TYPES)],
            'album_size' => ['required', Rule::in(Project::ALBUM_SIZES)],
            'cover_type' => [
                'required',
                Rule::in(Project::coverTypesForAlbumType($this->input('album_type'))),
            ],
            'page_count' => [
                'required',
                'integer',
                Rule::in(Project::pageCountOptionsForAlbumType($this->input('album_type'))),
            ],
            'student_count' => ['required', 'integer', 'min:1', 'max:500'],
            'print_quantity' => ['required', 'integer', 'min:1', 'max:5000'],
        ];
    }
}
