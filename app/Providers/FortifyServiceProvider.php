<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\City;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::authenticateUsing(function (Request $request): ?User {
            $phone = PhoneNumber::normalize($request->string('phone')->toString());

            if (! filled($phone)) {
                return null;
            }

            $user = User::query()->where('phone', $phone)->first();

            if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
                return null;
            }

            if (! $user->isApproved()) {
                throw ValidationException::withMessages([
                    Fortify::username() => 'Ждите подтверждение аккаунта. Мы свяжемся с вами после проверки.',
                ]);
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canRegister' => Features::enabled(Features::registration()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn (Request $request) => Inertia::render('auth/register', [
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (City $city): array => [
                    'id' => $city->id,
                    'name' => $city->name,
                ])
                ->values(),
            'registrationPendingApproval' => (bool) $request->session()->get('registration_pending_approval', false),
            'registrationPendingApprovalToken' => $request->session()->get('registration_pending_approval_token'),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $username = PhoneNumber::normalize($request->input(Fortify::username()))
                ?? $request->input(Fortify::username());
            $throttleKey = Str::transliterate(Str::lower($username.'|'.$request->ip()));

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
