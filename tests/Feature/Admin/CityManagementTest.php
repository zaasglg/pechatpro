<?php

use App\Models\City;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Админ',
        'Фотограф',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('admins can view city management page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $city = City::factory()->create([
        'name' => 'Алматы',
    ]);

    $response = $this->actingAs($admin)->get(route('admin.cities.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/cities/index')
            ->has('cities', 1)
            ->where('cities.0.id', $city->id)
            ->where('cities.0.name', 'Алматы')
            ->where('cities.0.usersCount', 0),
        );
});

test('admins can create cities', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $this->actingAs($admin)
        ->post(route('admin.cities.store'), [
            'name' => 'Астана',
        ])
        ->assertRedirect(route('admin.cities.index'))
        ->assertSessionHas('status', 'Город Астана добавлен.');

    expect(City::query()->where('name', 'Астана')->exists())->toBeTrue();
});

test('admins can update cities', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $city = City::factory()->create([
        'name' => 'Шымкент',
    ]);

    $this->actingAs($admin)
        ->put(route('admin.cities.update', $city), [
            'name' => 'Тараз',
        ])
        ->assertRedirect(route('admin.cities.index'))
        ->assertSessionHas('status', 'Город Тараз обновлен.');

    expect($city->fresh()->name)->toBe('Тараз');
});

test('admins can delete unused cities', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $city = City::factory()->create([
        'name' => 'Костанай',
    ]);

    $this->actingAs($admin)
        ->delete(route('admin.cities.destroy', $city))
        ->assertRedirect(route('admin.cities.index'))
        ->assertSessionHas('status', 'Город Костанай удален.');

    expect(City::query()->whereKey($city->id)->exists())->toBeFalse();
});

test('admins can not delete cities assigned to users', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $city = City::factory()->create([
        'name' => 'Павлодар',
    ]);

    User::factory()->create([
        'city_id' => $city->id,
    ])->assignRole('Фотограф');

    $response = $this->actingAs($admin)->delete(route('admin.cities.destroy', $city));

    $response
        ->assertRedirect(route('admin.cities.index'))
        ->assertSessionHas('error', 'Город Павлодар нельзя удалить, пока он назначен пользователям.');

    expect(City::query()->whereKey($city->id)->exists())->toBeTrue();
});

test('non admins can not open city management page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->get(route('admin.cities.index'))
        ->assertForbidden();
});
