<?php

use App\Models\Project;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Фотограф',
        'Печать',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('print users can view only assigned printing projects', function () {
    $printUser = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Печатник Асем',
    ]);
    $printUser->assignRole('Печать');

    $otherPrintUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $otherPrintUser->assignRole('Печать');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $assignedProject = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом 11 А',
        'class_name' => '11 А',
    ]);
    $assignedProject->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $assignedProject->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$printUser->id]);
    $assignedProject->montageAssets()->create([
        'path' => "project-montage-assets/{$assignedProject->id}/one.jpg",
        'original_name' => 'one.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $foreignProject = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Чужой проект',
    ]);
    $foreignProject->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $foreignProject->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$otherPrintUser->id]);

    $this->actingAs($printUser)
        ->get(route('print.projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('print/projects/index')
            ->has('projects', 1)
            ->where('projects.0.id', $assignedProject->id)
            ->where('projects.0.name', 'Альбом 11 А')
            ->where('projects.0.readyWorksCount', 1),
        );
});

test('print users can open assigned project page', function () {
    $printUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $printUser->assignRole('Печать');

    $photographer = User::factory()->create([
        'name' => 'Фотограф Айбар',
    ]);
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Выпускной 9 Б',
        'class_name' => '9 Б',
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$printUser->id]);
    $asset = $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready.jpg",
        'original_name' => 'ready.jpg',
        'size_bytes' => 222_333,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($printUser)
        ->get(route('print.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('print/projects/show')
            ->where('project.id', $project->id)
            ->where('project.photographerName', 'Фотограф Айбар')
            ->where('readyWorks.0.id', $asset->id)
            ->where('readyWorks.0.name', 'ready.jpg'),
        );
});

test('print users can mark printing as ready and return project to moderator', function () {
    $printUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $printUser->assignRole('Печать');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$printUser->id]);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/final.jpg",
        'original_name' => 'final.jpg',
        'size_bytes' => 150_000,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($printUser)
        ->post(route('print.projects.complete', $project))
        ->assertRedirect(route('print.projects.index'))
        ->assertSessionHas('status', 'Печать отмечена как готовая. Проект отправлен модератору.');

    expect($project->fresh()->printing_ready_at)->not()->toBeNull();
});

test('print users can download assigned ready work file', function () {
    Storage::fake('public');

    $printUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $printUser->assignRole('Печать');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$printUser->id]);

    Storage::disk('public')->put("project-montage-assets/{$project->id}/print-ready.jpg", 'print-image');

    $asset = $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/print-ready.jpg",
        'original_name' => 'print-ready.jpg',
        'size_bytes' => 150_000,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($printUser)
        ->get(route('print.projects.works.download', [$project, $asset]))
        ->assertOk()
        ->assertDownload('print-ready.jpg');
});

test('print users can download assigned ready works as archive', function () {
    Storage::fake('public');

    $printUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $printUser->assignRole('Печать');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$printUser->id]);

    Storage::disk('public')->put("project-montage-assets/{$project->id}/print-ready-1.jpg", 'first-image');
    Storage::disk('public')->put("project-montage-assets/{$project->id}/print-ready-2.jpg", 'second-image');

    $project->montageAssets()->createMany([
        [
            'path' => "project-montage-assets/{$project->id}/print-ready-1.jpg",
            'original_name' => 'print-ready-1.jpg',
            'size_bytes' => 150_000,
            'mime_type' => 'image/jpeg',
        ],
        [
            'path' => "project-montage-assets/{$project->id}/print-ready-2.jpg",
            'original_name' => 'print-ready-2.jpg',
            'size_bytes' => 151_000,
            'mime_type' => 'image/jpeg',
        ],
    ]);

    $this->actingAs($printUser)
        ->get(route('print.projects.archive', $project))
        ->assertOk()
        ->assertDownload("project-{$project->id}-ready-works.zip");
});
