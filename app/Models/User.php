<?php

namespace App\Models;

use App\Support\PhoneNumber;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'phone', 'instagram_url', 'city_id', 'password', 'avatar_path'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'avatar_path'])]
#[Appends(['avatar'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }

    public function approve(): void
    {
        $this->forceFill([
            'approved_at' => now(),
        ])->save();
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'photographer_id');
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function responsibleProjectStages(): BelongsToMany
    {
        return $this->belongsToMany(ProjectStage::class, 'project_stage_user')
            ->withTimestamps();
    }

    /**
     * Normalize user phone numbers before persisting them.
     */
    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value): ?string => PhoneNumber::normalize($value),
        );
    }

    /**
     * Get the user's public avatar URL.
     */
    protected function avatar(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes): ?string => filled($attributes['avatar_path'] ?? null)
                ? Storage::disk('public')->url((string) $attributes['avatar_path'])
                : null,
        );
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'city_id' => 'integer',
            'password' => 'hashed',
            'approved_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
