<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectMontageRevisionRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectMontageRevisionRequest>
 */
class ProjectMontageRevisionRequestFactory extends Factory
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
            'project_montage_asset_id' => ProjectMontageAsset::factory(),
            'comment' => fake()->optional()->sentence(),
        ];
    }
}
