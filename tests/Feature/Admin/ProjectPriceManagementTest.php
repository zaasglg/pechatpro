<?php

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

test('admins can view project price management page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $this->actingAs($admin)
        ->get(route('admin.project-prices.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/project-prices/index')
            ->has('albumPricingRules', 16)
            ->has('portraitPricingRules', 6)
            ->where('albumPricingRules.0.albumType', 'Пластик')
            ->where('portraitPricingRules.5.portraitCount', 7),
        );
});

test('admins can see hardcoded album and portrait price rules', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $this->actingAs($admin)
        ->get(route('admin.project-prices.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('albumPricingRules', fn ($rules): bool => collect($rules)->contains(
                fn (array $rule): bool => $rule['albumType'] === 'Журнал'
                    && $rule['albumSize'] === '25x25'
                    && $rule['coverPrice'] === 2500
                    && $rule['pagePrice'] === 200,
            ))
            ->where('portraitPricingRules', fn ($rules): bool => collect($rules)->contains(
                fn (array $rule): bool => $rule['portraitCount'] === 6
                    && $rule['extraPrice'] === 900,
            )),
        );
});

test('admins can not create project prices through database routes anymore', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $this->actingAs($admin)
        ->post('/admin/project-prices', [])
        ->assertMethodNotAllowed();
});

test('admins can not update project prices through database routes anymore', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $this->actingAs($admin)
        ->put('/admin/project-prices/1', [])
        ->assertNotFound();
});

test('admins can not delete project prices through database routes anymore', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $this->actingAs($admin)
        ->delete('/admin/project-prices/1')
        ->assertNotFound();
});

test('non admins can not open project price management page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->get(route('admin.project-prices.index'))
        ->assertForbidden();
});
