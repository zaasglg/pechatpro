<?php

use App\Models\User;
use Database\Seeders\RolesAndDemoUsersSeeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();
});

test('roles and demo users seeder creates all configured roles', function () {
    $this->seed(RolesAndDemoUsersSeeder::class);

    expect(Role::query()->pluck('name')->all())->toEqualCanonicalizing([
        'Админ',
        'Фотограф',
        'Монтажер',
        'Печать',
        'Модератор',
    ]);
});

test('roles and demo users seeder assigns every demo user to the expected role', function () {
    $this->seed(RolesAndDemoUsersSeeder::class);

    $expectedAssignments = [
        '+77010000001' => 'Админ',
        '+77010000002' => 'Фотограф',
        '+77010000003' => 'Монтажер',
        '+77010000004' => 'Печать',
        '+77010000005' => 'Модератор',
    ];

    foreach ($expectedAssignments as $phone => $role) {
        $user = User::query()->where('phone', $phone)->first();

        expect($user)->not->toBeNull();
        expect($user->hasRole($role))->toBeTrue();
    }
});
