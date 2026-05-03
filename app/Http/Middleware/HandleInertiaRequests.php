<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $this->authenticatedUser($request),
            ],
            'localization' => [
                'currentLocale' => $request->session()->get(
                    'locale',
                    config('app.frontend_locale', App::currentLocale()),
                ),
                'availableLocales' => collect(config('app.supported_locales', []))
                    ->map(fn (string $label, string $code): array => [
                        'code' => $code,
                        'label' => $label,
                    ])
                    ->values()
                    ->all(),
                'translations' => fn (): array => trans('frontend'),
            ],
            'flash' => [
                'toast' => fn (): ?array => $this->flashToast($request),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'largeFileUploadEnabled' => (bool) config('uploads.large_file_enabled'),
        ];
    }

    /**
     * Transform the authenticated user into stable frontend props.
     *
     * @return array<string, mixed>|null
     */
    private function authenticatedUser(Request $request): ?array
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user === null) {
            return null;
        }

        return [
            'id' => $user->id,
            'city_id' => $user->city_id,
            'city_name' => $user->city?->name,
            'instagram_url' => $user->instagram_url,
            'name' => $user->name,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'roles' => $user->roles()->pluck('name')->values()->all(),
            'canApprovePhotographers' => $user->hasRole('Админ') || $user->hasRole('Модератор'),
            'canManageProjectPrices' => $user->hasRole('Админ'),
            'canManageUsers' => $user->hasRole('Админ'),
            'canModerateProjects' => $user->hasRole('Модератор'),
            'canMontageProjects' => $user->hasRole('Монтажер') || $user->hasRole('Дизайнер'),
            'canPrintProjects' => $user->hasRole('Печать'),
        ];
    }

    /**
     * @return array{message: string, type: 'success'|'error'|'info'|'warning'}|null
     */
    private function flashToast(Request $request): ?array
    {
        /** @var array{message?: mixed, type?: mixed}|null $toast */
        $toast = $request->session()->get('toast');

        if (is_array($toast) && is_string($toast['message'] ?? null)) {
            $type = $toast['type'] ?? 'success';

            return [
                'message' => $toast['message'],
                'type' => in_array($type, ['success', 'error', 'info', 'warning'], true)
                    ? $type
                    : 'success',
            ];
        }

        $status = $request->session()->get('status');

        if (! is_string($status) || $status === '') {
            return null;
        }

        return [
            'message' => $status,
            'type' => 'success',
        ];
    }
}
