<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('project_stages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('project_stage_definition_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'project_stage_definition_id']);
        });

        $projectIds = DB::table('projects')->pluck('id');
        $definitionIds = DB::table('project_stage_definitions')
            ->orderBy('sort_order')
            ->pluck('id');

        if ($projectIds->isEmpty() || $definitionIds->isEmpty()) {
            return;
        }

        $now = now();
        $rows = [];

        foreach ($projectIds as $projectId) {
            foreach ($definitionIds as $definitionId) {
                $rows[] = [
                    'project_id' => $projectId,
                    'project_stage_definition_id' => $definitionId,
                    'status' => 'pending',
                    'completed_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('project_stages')->insert($rows);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_stages');
    }
};
