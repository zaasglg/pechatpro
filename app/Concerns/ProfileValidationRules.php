<?php

namespace App\Concerns;

use App\Models\City;
use App\Models\User;
use Closure;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'city_id' => $this->cityRules(),
            'name' => $this->nameRules(),
            'phone' => $this->phoneRules($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user cities.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function cityRules(): array
    {
        return [
            'required',
            'integer',
            Rule::exists(City::class, 'id'),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user phone numbers.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function phoneRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'min:10',
            'max:20',
            'regex:/^\+?[0-9\s\-\(\)]+$/',
            $userId === null
                ? Rule::unique(User::class, 'phone')
                : Rule::unique(User::class, 'phone')->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate Instagram profile links.
     *
     * @return array<int, Closure|\Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function instagramUrlRules(): array
    {
        return [
            'required',
            'string',
            'max:255',
            'url:http,https',
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value)) {
                    $fail('Укажите ссылку на Instagram-профиль.');

                    return;
                }

                $host = parse_url($value, PHP_URL_HOST);
                $path = trim((string) parse_url($value, PHP_URL_PATH), '/');
                $segments = array_values(array_filter(explode('/', $path)));
                $normalizedHost = is_string($host) ? Str::lower($host) : null;

                if (
                    ! is_string($normalizedHost)
                    || (! in_array($normalizedHost, ['instagram.com', 'www.instagram.com'], true)
                        && ! Str::endsWith($normalizedHost, '.instagram.com'))
                    || count($segments) !== 1
                ) {
                    $fail('Укажите ссылку на Instagram-профиль.');
                }
            },
        ];
    }
}
