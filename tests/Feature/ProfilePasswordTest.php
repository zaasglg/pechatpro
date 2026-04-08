<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('authenticated users can update their password from profile', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('profile.password.update'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.show'))
        ->assertSessionHas('status', 'Пароль обновлен.');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

test('profile password update requires current password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.show'))
        ->put(route('profile.password.update'), [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertSessionHasErrors(['current_password'])
        ->assertRedirect(route('profile.show'));
});
