<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectClientSelectionSubmissionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $project = Project::query()
            ->where('client_selection_token', $this->route('token'))
            ->first();
        $portraitCount = max((int) ($project?->portrait_count ?? 0), 0);

        return [
            'first_name' => ['required', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'student_quote' => ['required', 'string', 'max:500'],
            'selected_image_ids' => [
                'required',
                'array',
                'distinct',
                "min:{$portraitCount}",
                "max:{$portraitCount}",
            ],
            'selected_image_ids.*' => [
                'required',
                'integer',
                Rule::exists('project_source_images', 'id'),
            ],
        ];
    }
}
