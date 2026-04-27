<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
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
            'photographer_id' => User::factory(),
            'name' => fake()->words(3, true),
            'class_name' => fake()->randomElement(Project::CLASS_OPTIONS),
            'album_type' => $albumType,
            'album_size' => fake()->randomElement(Project::ALBUM_SIZES),
            'cover_type' => fake()->randomElement(Project::coverTypesForAlbumType($albumType)),
            'page_count' => fake()->randomElement(Project::pageCountOptionsForAlbumType($albumType)),
            'portrait_count' => fake()->numberBetween(0, 7),
            'student_count' => fake()->numberBetween(10, 40),
            'print_quantity' => fake()->numberBetween(10, 100),
        ];
    }
}
