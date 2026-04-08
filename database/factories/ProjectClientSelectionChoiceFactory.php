<?php

namespace Database\Factories;

use App\Models\ProjectClientSelectionChoice;
use App\Models\ProjectClientSelectionSlot;
use App\Models\ProjectSourceImage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectClientSelectionChoice>
 */
class ProjectClientSelectionChoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_client_selection_slot_id' => ProjectClientSelectionSlot::factory(),
            'project_source_image_id' => ProjectSourceImage::factory(),
        ];
    }
}
