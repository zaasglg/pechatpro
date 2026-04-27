<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    foreach (['Админ', 'Модератор', 'Фотограф', 'Монтажер', 'Дизайнер', 'Печать'] as $role) {
        Role::findOrCreate($role, 'web');
    }
});

test('admin can view users grouped by role', function () {
    $admin = User::factory()->create(['approved_at' => now()]);
    $admin->assignRole('Админ');

    $photographer = User::factory()->create(['approved_at' => now()]);
    $photographer->assignRole('Фотограф');

    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->has('users', 2)
            ->has('roles', 6),
        );
});

test('non admin cannot access users page', function () {
    $moderator = User::factory()->create(['approved_at' => now()]);
    $moderator->assignRole('Модератор');

    $this->actingAs($moderator)
        ->get(route('admin.users.index'))
        ->assertForbidden();
});

test('admin can reset user password', function () {
    $admin = User::factory()->create(['approved_at' => now()]);
    $admin->assignRole('Админ');

    $target = User::factory()->create([
        'approved_at' => now(),
        'password' => Hash::make('old-password'),
    ]);
    $target->assignRole('Фотограф');

    $this->actingAs($admin)
        ->post(route('admin.users.reset-password', $target), [
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])
        ->assertRedirect();

    $target->refresh();

    expect(Hash::check('NewPassword123!', $target->password))->toBeTrue();
});

test('admin cannot reset password with mismatched confirmation', function () {
    $admin = User::factory()->create(['approved_at' => now()]);
    $admin->assignRole('Админ');

    $target = User::factory()->create(['approved_at' => now()]);
    $target->assignRole('Фотограф');

    $this->actingAs($admin)
        ->from(route('admin.users.index'))
        ->post(route('admin.users.reset-password', $target), [
            'password' => 'NewPassword123!',
            'password_confirmation' => 'Mismatch123!',
        ])
        ->assertRedirect(route('admin.users.index'))
        ->assertSessionHasErrors('password');
});

test('non admin cannot reset user password', function () {
    $moderator = User::factory()->create(['approved_at' => now()]);
    $moderator->assignRole('Модератор');

    $target = User::factory()->create(['approved_at' => now()]);
    $target->assignRole('Фотограф');

    $this->actingAs($moderator)
        ->post(route('admin.users.reset-password', $target), [
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])
        ->assertForbidden();
});
