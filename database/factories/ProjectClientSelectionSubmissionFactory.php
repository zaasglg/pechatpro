<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectClientSelectionSubmission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectClientSelectionSubmission>
 */
class ProjectClientSelectionSubmissionFactory extends Factory
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
            'student_name' => fake()->name(),
            'student_quote' => fake()->sentence(),
            'submitted_at' => now(),
        ];
    }
}
