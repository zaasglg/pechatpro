<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectMontageAsset;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectMontageAsset>
 */
class ProjectMontageAssetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'path' => 'project-montage-assets/'.fake()->uuid().'.jpg',
            'original_name' => fake()->lexify('montage-????').'.jpg',
            'size_bytes' => fake()->numberBetween(120_000, 5_000_000),
            'mime_type' => 'image/jpeg',
        ];
    }
}
