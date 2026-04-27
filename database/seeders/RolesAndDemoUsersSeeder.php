<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndDemoUsersSeeder extends Seeder
{
    private const BULK_DEMO_COUNT_PER_ROLE = 40;

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
            'name' => 'Демо Дизайнер',
            'role' => 'Дизайнер',
            'phone' => '+77010000004',
            'city' => 'Караганда',
        ],
        [
            'name' => 'Демо Печать',
            'role' => 'Печать',
            'phone' => '+77010000005',
            'city' => 'Тараз',
        ],
        [
            'name' => 'Демо Модератор',
            'role' => 'Модератор',
            'phone' => '+77010000006',
            'city' => 'Актобе',
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $cityIds = City::query()->pluck('id')->all();

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

        $this->seedBulkRoleUsers('Монтажер', 'Демо Монтажер', '+770110', $cityIds);
        $this->seedBulkRoleUsers('Дизайнер', 'Демо Дизайнер', '+770115', $cityIds);
        $this->seedBulkRoleUsers('Печать', 'Демо Печать', '+770120', $cityIds);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * @param  array<int, int>  $cityIds
     */
    private function seedBulkRoleUsers(string $role, string $namePrefix, string $phonePrefix, array $cityIds): void
    {
        foreach (range(1, self::BULK_DEMO_COUNT_PER_ROLE) as $index) {
            $phone = sprintf('%s%04d', $phonePrefix, $index);

            $user = User::query()->updateOrCreate(
                ['phone' => $phone],
                [
                    'approved_at' => now(),
                    'city_id' => fake()->randomElement($cityIds),
                    'name' => sprintf('%s %02d', $namePrefix, $index),
                    'password' => 'password',
                ],
            );

            $user->syncRoles([$role]);
        }
    }
}
