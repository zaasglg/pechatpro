<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('authenticated user can upload an avatar', function () {
    Storage::fake('public');

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.show'));

    $user->refresh();

    expect($user->avatar_path)->not->toBeNull()
        ->and($user->avatar)->toBe('/storage/'.$user->avatar_path);

    Storage::disk('public')->assertExists($user->avatar_path);
});

test('uploading a new avatar replaces the previous file', function () {
    Storage::fake('public');

    $previousAvatarPath = 'avatars/old-avatar.jpg';
    Storage::disk('public')->put($previousAvatarPath, 'old-avatar');

    $user = User::factory()->create([
        'avatar_path' => $previousAvatarPath,
    ]);

    $response = $this
        ->actingAs($user)
        ->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->image('updated-avatar.png'),
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.show'));

    $user->refresh();

    expect($user->avatar_path)->not->toBe($previousAvatarPath);

    Storage::disk('public')->assertMissing($previousAvatarPath);
    Storage::disk('public')->assertExists($user->avatar_path);
});
