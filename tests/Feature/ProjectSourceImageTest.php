<?php

use App\Models\Project;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    Role::findOrCreate('Фотограф', 'web');
});

test('photographers can open source images page for their project', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Алматы 7 класс',
        'class_name' => '9 А',
    ]);

    $sourceImage = ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
    ]);

    $this->actingAs($photographer)
        ->get(route('projects.source-images.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/source-images')
            ->where('project.id', $project->id)
            ->where('project.name', 'Алматы 7 класс')
            ->where('workflow.currentStageName', 'Новый проект')
            ->where('workflow.currentStageSlug', ProjectStageDefinition::SLUG_NEW_PROJECT)
            ->where('workflow.canMarkReady', true)
            ->has('sourceImages', 1)
            ->where('sourceImages.0.id', $sourceImage->id)
            ->where('sourceImages.0.name', 'source-1.jpg'),
        );
});

test('photographers can upload multiple source images to their project', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $response = $this->actingAs($photographer)
        ->post(route('projects.source-images.store', $project), [
            'images' => [
                UploadedFile::fake()->image('source-1.jpg'),
                UploadedFile::fake()->image('source-2.png'),
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('projects.source-images.show', $project))
        ->assertSessionHas('status', 'Исходники успешно загружены.');

    $project->refresh();

    $sourceImages = $project->sourceImages()->get();

    expect($sourceImages)->toHaveCount(2);

    foreach ($sourceImages as $sourceImage) {
        Storage::disk('public')->assertExists($sourceImage->path);
    }
});

test('photographers can move project to photographer shot stage after confirming source images', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
    ]);

    $response = $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project));

    $response
        ->assertRedirect(route('projects.source-images.show', $project))
        ->assertSessionHas('status', 'Проект переведен на этап "Фотограф снял".');

    $project->refresh();
    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->status)->toBe('in_progress');
});

test('legacy projects still allow confirming source images when the old active stage is photographer shot', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
    ]);

    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    $stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->update([
        'status' => 'pending',
        'completed_at' => null,
    ]);
    $stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->update([
        'status' => 'in_progress',
        'completed_at' => null,
    ]);

    $this->actingAs($photographer)
        ->get(route('projects.source-images.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('workflow.canMarkReady', true)
            ->where('workflow.currentStageSlug', ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT),
        );

    $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project))
        ->assertRedirect(route('projects.source-images.show', $project))
        ->assertSessionHas('status', 'Проект переведен на этап "Фотограф снял".');

    $project->refresh();
    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->status)->toBe('in_progress');
});

test('photographers can not move project to photographer shot stage without source images', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project))
        ->assertSessionHasErrors([
            'images' => 'Сначала загрузите исходники.',
        ]);
});

test('photographers can not open another photographers source images page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->get(route('projects.source-images.show', $project))
        ->assertNotFound();
});

test('photographers can not upload images into another photographers project', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->post(route('projects.source-images.store', $project), [
            'images' => [
                UploadedFile::fake()->image('source-1.jpg'),
            ],
        ])
        ->assertNotFound();

    expect($project->sourceImages()->exists())->toBeFalse();
});

test('photographers can not complete source images stage for another photographers project', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project))
        ->assertNotFound();
});
