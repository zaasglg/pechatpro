<?php

namespace Database\Factories;

use App\Models\City;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    private const CITY_NAMES = [
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
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement(self::CITY_NAMES),
        ];
    }
}
