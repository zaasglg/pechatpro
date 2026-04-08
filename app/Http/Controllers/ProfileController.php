<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfileAvatarRequest;
use App\Http\Requests\UpdateProfileInformationRequest;
use App\Http\Requests\UpdateProfilePasswordRequest;
use App\Models\City;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile page.
     */
    public function show(Request $request): Response
    {
        $user = $request->user()?->load('city:id,name');

        return Inertia::render('profile/show', [
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (City $city): array => [
                    'id' => $city->id,
                    'name' => $city->name,
                ])
                ->values(),
            'user' => [
                'id' => $user?->id,
                'name' => $user?->name,
                'phone' => $user?->phone,
                'instagram_url' => $user?->instagram_url,
                'city_id' => $user?->city_id,
                'city_name' => $user?->city?->name,
                'avatar' => $user?->avatar,
                'created_at' => $user?->created_at,
                'updated_at' => $user?->updated_at,
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(UpdateProfileInformationRequest $request): RedirectResponse
    {
        $request->user()->update($request->validated());

        return to_route('profile.show')
            ->with('status', 'Профиль обновлен.');
    }

    /**
     * Update the user's avatar.
     */
    public function updateAvatar(UpdateProfileAvatarRequest $request): RedirectResponse
    {
        $user = $request->user();
        $previousAvatarPath = $user->avatar_path;
        $avatarPath = $request->file('avatar')->store('avatars', 'public');

        $user->update([
            'avatar_path' => $avatarPath,
        ]);

        if (filled($previousAvatarPath)) {
            Storage::disk('public')->delete($previousAvatarPath);
        }

        return to_route('profile.show');
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(UpdateProfilePasswordRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => Hash::make($request->validated('password')),
        ]);

        return to_route('profile.show')
            ->with('status', 'Пароль обновлен.');
    }
}
