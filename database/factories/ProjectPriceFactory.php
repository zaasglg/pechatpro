<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectPrice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectPrice>
 */
class ProjectPriceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $albumType = fake()->randomElement(Project::ALBUM_TYPES);

        return [
            'album_type' => $albumType,
            'album_size' => fake()->randomElement(Project::ALBUM_SIZES),
            'cover_type' => fake()->randomElement(Project::coverTypesForAlbumType($albumType)),
            'page_count' => fake()->randomElement(Project::pageCountOptionsForAlbumType($albumType)),
            'unit_price' => fake()->randomFloat(2, 1000, 50000),
        ];
    }
}
