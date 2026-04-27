<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Spatie\Permission\Models\Role;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    private const DEFAULT_ROLE = 'Фотограф';

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $input['phone'] = PhoneNumber::normalize($input['phone'] ?? null) ?? ($input['phone'] ?? '');
        $input['instagram_url'] = $this->normalizeInstagramUrl($input['instagram_url'] ?? null);

        Validator::make($input, [
            ...$this->profileRules(),
            'instagram_url' => $this->registrationInstagramUrlRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        return DB::transaction(function () use ($input): User {
            $user = User::create([
                'city_id' => $input['city_id'],
                'name' => $input['name'],
                'phone' => $input['phone'],
                'instagram_url' => $input['instagram_url'],
                'password' => $input['password'],
            ]);

            $user->assignRole(Role::findOrCreate(self::DEFAULT_ROLE, 'web'));

            return $user;
        });
    }

    /**
     * Get the validation rules used during registration for Instagram profile links.
     *
     * @return array<int, \Closure|Rule|array<mixed>|string>
     */
    private function registrationInstagramUrlRules(): array
    {
        return [
            'nullable',
            ...array_values(array_filter(
                $this->instagramUrlRules(),
                static fn (mixed $rule): bool => $rule !== 'required',
            )),
        ];
    }

    private function normalizeInstagramUrl(?string $instagramUrl): ?string
    {
        $normalizedInstagramUrl = rtrim(trim((string) $instagramUrl), '/');

        return $normalizedInstagramUrl !== '' ? $normalizedInstagramUrl : null;
    }
}
