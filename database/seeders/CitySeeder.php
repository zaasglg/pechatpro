<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    /**
     * @var array<int, string>
     */
    private const CITIES = [
        'Алматы',
        'Астана',
        'Шымкент',
        'Караганда',
        'Актобе',
        'Тараз',
        'Павлодар',
        'Усть-Каменогорск',
        'Семей',
        'Костанай',
        'Кызылорда',
        'Атырау',
        'Актау',
        'Петропавловск',
        'Талдыкорган',
        'Кокшетау',
        'Туркестан',
        'Жезказган',
        'Экибастуз',
        'Рудный',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        City::query()->upsert(
            array_map(static fn (string $name): array => [
                'name' => $name,
                'created_at' => $now,
                'updated_at' => $now,
            ], self::CITIES),
            ['name'],
            ['updated_at'],
        );
    }
}
