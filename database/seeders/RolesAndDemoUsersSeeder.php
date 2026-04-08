<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndDemoUsersSeeder extends Seeder
{
    /**
     * @var array<int, array{name: string, role: string, phone: string, city: string}>
     */
    private const DEMO_USERS = [
        [
            'name' => 'Демо Админ',
            'role' => 'Админ',
            'phone' => '+77010000001',
            'city' => 'Астана',
        ],
        [
            'name' => 'Демо Фотограф',
            'role' => 'Фотограф',
            'phone' => '+77010000002',
            'city' => 'Алматы',
        ],
        [
            'name' => 'Демо Монтажер',
            'role' => 'Монтажер',
            'phone' => '+77010000003',
            'city' => 'Шымкент',
        ],
        [
            'name' => 'Демо Печать',
            'role' => 'Печать',
            'phone' => '+77010000004',
            'city' => 'Караганда',
        ],
        [
            'name' => 'Демо Модератор',
            'role' => 'Модератор',
            'phone' => '+77010000005',
            'city' => 'Актобе',
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        collect(self::DEMO_USERS)
            ->pluck('role')
            ->unique()
            ->each(fn (string $role) => Role::findOrCreate($role, 'web'));

        foreach (self::DEMO_USERS as $demoUser) {
            $user = User::query()->updateOrCreate(
                ['phone' => $demoUser['phone']],
                [
                    'approved_at' => now(),
                    'city_id' => City::query()->where('name', $demoUser['city'])->value('id'),
                    'name' => $demoUser['name'],
                    'password' => 'password',
                ],
            );

            $user->syncRoles([$demoUser['role']]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
