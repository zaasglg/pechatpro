<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
        Schema::create('project_stage_definitions', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('sort_order');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_stage_definitions');
    }
};
