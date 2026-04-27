<?php

namespace Database\Factories;

use App\Models\ProjectClientSelectionSubmission;
use App\Models\ProjectClientSelectionSubmissionImage;
use App\Models\ProjectSourceImage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectClientSelectionSubmissionImage>
 */
class ProjectClientSelectionSubmissionImageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_client_selection_submission_id' => ProjectClientSelectionSubmission::factory(),
            'project_source_image_id' => ProjectSourceImage::factory(),
        ];
    }
}
