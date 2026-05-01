<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResetUserPasswordRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Roles exposed in the admin user manager.
     *
     * @var array<int, string>
     */
    private const MANAGED_ROLES = [
        'Админ',
        'Модератор',
        'Фотограф',
        'Монтажер',
        'Дизайнер',
        'Печать',
    ];

    public function index(Request $request): Response
    {
        $users = User::query()
            ->with(['city:id,name', 'roles:id,name'])
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'city_id', 'approved_at', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'cityName' => $user->city?->name,
                'roles' => $user->roles->pluck('name')->values()->all(),
                'approvedAt' => $user->approved_at?->toIso8601String(),
                'createdAt' => $user->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'roles' => self::MANAGED_ROLES,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_if($user->id === auth()->id(), 403, 'Нельзя удалить собственный аккаунт.');

        $userName = $user->name;
        $avatarPath = $user->avatar_path;

        $user->delete();

        if (filled($avatarPath)) {
            Storage::disk('public')->delete($avatarPath);
        }

        return back()->with('status', "Пользователь {$userName} удалён.");
    }

    public function resetPassword(ResetUserPasswordRequest $request, User $user): RedirectResponse
    {
        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        return back()->with('status', "Пароль пользователя {$user->name} обновлен.");
    }
}
