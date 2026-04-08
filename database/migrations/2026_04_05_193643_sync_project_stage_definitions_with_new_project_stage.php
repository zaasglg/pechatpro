<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * @var array<int, array{name: string, slug: string, sort_order: int, is_active: bool}>
     */
    private const DEFAULT_DEFINITIONS = [
        [
            'name' => 'Новый проект',
            'slug' => 'new-project',
            'sort_order' => 1,
            'is_active' => true,
        ],
        [
            'name' => 'Фотограф снял',
            'slug' => 'photographer-shot',
            'sort_order' => 2,
            'is_active' => true,
        ],
        [
            'name' => 'Выбор фотки от клиента',
            'slug' => 'client-photo-selection',
            'sort_order' => 3,
            'is_active' => true,
        ],
        [
            'name' => 'Монтаж',
            'slug' => 'montage',
            'sort_order' => 4,
            'is_active' => true,
        ],
        [
            'name' => 'Модерация',
            'slug' => 'moderation',
            'sort_order' => 5,
            'is_active' => true,
        ],
        [
            'name' => 'Печать',
            'slug' => 'printing',
            'sort_order' => 6,
            'is_active' => true,
        ],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        DB::table('project_stage_definitions')->upsert(
            array_map(static fn (array $definition): array => [
                ...$definition,
                'created_at' => $now,
                'updated_at' => $now,
            ], self::DEFAULT_DEFINITIONS),
            ['slug'],
            ['name', 'sort_order', 'is_active', 'updated_at'],
        );

        $projectIds = DB::table('projects')->pluck('id');
        $definitions = DB::table('project_stage_definitions')
            ->select(['id'])
            ->get();

        if ($projectIds->isEmpty() || $definitions->isEmpty()) {
            return;
        }

        $existingLookup = array_fill_keys(
            DB::table('project_stages')
                ->select(['project_id', 'project_stage_definition_id'])
                ->get()
                ->map(
                    static fn (object $row): string => "{$row->project_id}:{$row->project_stage_definition_id}",
                )
                ->all(),
            true,
        );

        $rows = [];

        foreach ($projectIds as $projectId) {
            foreach ($definitions as $definition) {
                $pair = "{$projectId}:{$definition->id}";

                if (isset($existingLookup[$pair])) {
                    continue;
                }

                $rows[] = [
                    'project_id' => $projectId,
                    'project_stage_definition_id' => $definition->id,
                    'status' => 'pending',
                    'completed_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if ($rows !== []) {
            DB::table('project_stages')->insert($rows);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $newProjectDefinition = DB::table('project_stage_definitions')
            ->where('slug', 'new-project')
            ->first();

        if ($newProjectDefinition !== null) {
            DB::table('project_stages')
                ->where('project_stage_definition_id', $newProjectDefinition->id)
                ->delete();

            DB::table('project_stage_definitions')
                ->where('id', $newProjectDefinition->id)
                ->delete();
        }

        DB::table('project_stage_definitions')
            ->where('slug', 'photographer-shot')
            ->update(['sort_order' => 1]);

        DB::table('project_stage_definitions')
            ->where('slug', 'client-photo-selection')
            ->update(['sort_order' => 2]);

        DB::table('project_stage_definitions')
            ->where('slug', 'montage')
            ->update(['sort_order' => 3]);

        DB::table('project_stage_definitions')
            ->where('slug', 'moderation')
            ->update(['sort_order' => 4]);

        DB::table('project_stage_definitions')
            ->where('slug', 'printing')
            ->update(['sort_order' => 5]);
    }
};
