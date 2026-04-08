<?php

namespace Database\Seeders;

use App\Models\ProjectStageDefinition;
use Illuminate\Database\Seeder;

class ProjectStageDefinitionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        ProjectStageDefinition::query()->upsert(
            array_map(static fn (array $definition): array => [
                ...$definition,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ], ProjectStageDefinition::DEFAULT_DEFINITIONS),
            ['slug'],
            ['name', 'sort_order', 'is_active', 'updated_at'],
        );
    }
}
