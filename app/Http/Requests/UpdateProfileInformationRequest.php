<?php

namespace App\Http\Requests;

use App\Concerns\ProfileValidationRules;
use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileInformationRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()?->id),
            'instagram_url' => $this->instagramUrlRules(),
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'city_id' => $this->input('city_id'),
            'phone' => PhoneNumber::normalize($this->input('phone')) ?? $this->input('phone'),
            'instagram_url' => rtrim(trim((string) $this->input('instagram_url')), '/'),
        ]);
    }
}
