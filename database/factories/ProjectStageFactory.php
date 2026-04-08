<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectStage>
 */
class ProjectStageFactory extends Factory
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
            'project_stage_definition_id' => ProjectStageDefinition::factory(),
            'status' => ProjectStage::STATUS_PENDING,
            'completed_at' => null,
        ];
    }
}
