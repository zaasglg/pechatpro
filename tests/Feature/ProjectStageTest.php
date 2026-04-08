<?php

use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

test('project stage tables contain the required columns', function () {
    expect(Schema::hasColumns('project_stage_definitions', [
        'id',
        'name',
        'slug',
        'sort_order',
        'is_active',
        'created_at',
        'updated_at',
    ]))->toBeTrue();

    expect(Schema::hasColumns('project_stages', [
        'id',
        'project_id',
        'project_stage_definition_id',
        'status',
        'completed_at',
        'created_at',
        'updated_at',
    ]))->toBeTrue();

    expect(Schema::hasColumns('project_stage_user', [
        'project_stage_id',
        'user_id',
        'created_at',
        'updated_at',
    ]))->toBeTrue();
});

test('projects receive the default realization stages when they are created', function () {
    $project = Project::factory()->create();

    $stages = $project->fresh()
        ->projectStages()
        ->with('stageDefinition')
        ->get()
        ->sortBy(fn (ProjectStage $stage): int => $stage->stageDefinition->sort_order)
        ->values();

    expect($stages)->toHaveCount(count(ProjectStageDefinition::DEFAULT_DEFINITIONS));
    expect($stages->pluck('stageDefinition.name')->all())->toBe(
        collect(ProjectStageDefinition::DEFAULT_DEFINITIONS)
            ->pluck('name')
            ->all(),
    );
    expect($stages->first()->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);
    expect($stages->skip(1)->pluck('status')->unique()->all())->toBe([ProjectStage::STATUS_PENDING]);
});

test('project stages can have responsible users assigned to them', function () {
    $project = Project::factory()->create();
    $stage = $project->projectStages()->firstOrFail();
    $users = User::factory()->count(2)->create();

    $stage->responsibleUsers()->sync($users->modelKeys());

    expect($stage->fresh()->responsibleUsers->pluck('id')->all())
        ->toEqualCanonicalizing($users->modelKeys());
});
