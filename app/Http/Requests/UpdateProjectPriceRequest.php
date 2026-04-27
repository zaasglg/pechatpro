<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectPriceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Админ') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
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
                Rule::unique('project_prices')
                    ->ignore($this->route('projectPrice'))
                    ->where(fn ($query) => $query
                        ->where('album_type', $this->input('album_type'))
                        ->where('album_size', $this->input('album_size'))
                        ->where('cover_type', $this->input('cover_type'))),
            ],
            'unit_price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
