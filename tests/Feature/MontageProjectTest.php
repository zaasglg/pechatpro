<?php

use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectMontageRevisionRequest;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Монтажер',
        'Фотограф',
        'Модератор',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('montage users can view only projects assigned to them for montage', function () {
    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $anotherMontageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $anotherMontageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $ownProject = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Монтаж 11 А',
        'class_name' => '11 А',
    ]);
    $ownProject->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $ownProject->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$montageUser->id]);

    $foreignProject = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Чужой монтаж',
    ]);
    $foreignProject->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $foreignProject->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$anotherMontageUser->id]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('montage/projects/index')
            ->has('projects', 1)
            ->where('projects.0.id', $ownProject->id)
            ->where('projects.0.name', 'Монтаж 11 А'),
        );
});

test('montage users can open assigned montage works page', function () {
    Storage::fake('public');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create([
        'name' => 'Фотограф Айдар',
    ]);
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом монтаж',
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$montageUser->id]);

    $asset = ProjectMontageAsset::factory()->for($project)->create([
        'path' => "project-montage-assets/{$project->id}/ready-1.jpg",
        'original_name' => 'ready-1.jpg',
    ]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.works.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('montage/projects/works')
            ->where('project.id', $project->id)
            ->where('project.photographerName', 'Фотограф Айдар')
            ->where('workflow.currentStageSlug', ProjectStageDefinition::SLUG_MONTAGE)
            ->where('workflow.canMarkReady', true)
            ->where('montageAssets.0.id', $asset->id)
            ->where('montageAssets.0.name', 'ready-1.jpg'),
        );
});

test('montage users can upload ready works for assigned project', function () {
    Storage::fake('public');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$montageUser->id]);

    $response = $this->actingAs($montageUser)
        ->post(route('montage.projects.works.store', $project), [
            'images' => [
                UploadedFile::fake()->image('ready-1.jpg'),
                UploadedFile::fake()->image('ready-2.png'),
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('montage.projects.works.show', $project))
        ->assertSessionHas('status', 'Готовые работы успешно загружены.');

    expect($project->montageAssets()->count())->toBe(2);
});

test('montage users can replace ready work that needs revision', function () {
    Storage::fake('public');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'montage_review_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$montageUser->id]);

    Storage::disk('public')->put("project-montage-assets/{$project->id}/old-ready.jpg", 'old-file');

    $asset = ProjectMontageAsset::factory()->for($project)->create([
        'path' => "project-montage-assets/{$project->id}/old-ready.jpg",
        'original_name' => 'old-ready.jpg',
        'mime_type' => 'image/jpeg',
    ]);

    ProjectMontageRevisionRequest::factory()->create([
        'project_id' => $project->id,
        'project_montage_asset_id' => $asset->id,
        'comment' => 'Заменить фото на исправленную версию.',
    ]);

    $response = $this->actingAs($montageUser)
        ->post(route('montage.projects.works.replace', [$project, $asset]), [
            'image' => UploadedFile::fake()->image('new-ready.png'),
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('montage.projects.works.show', $project))
        ->assertSessionHas('status', 'Готовая работа успешно заменена.');

    $asset->refresh();

    expect($asset->original_name)->toBe('new-ready.png');
    expect($asset->mime_type)->toBe('image/png');
    expect($asset->path)->not->toBe("project-montage-assets/{$project->id}/old-ready.jpg");
    Storage::disk('public')->assertMissing("project-montage-assets/{$project->id}/old-ready.jpg");
    Storage::disk('public')->assertExists($asset->path);
    expect($project->montageAssets()->count())->toBe(1);
});

test('montage users can send project to moderator after uploading ready works', function () {
    Storage::fake('public');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$montageUser->id]);
    ProjectMontageAsset::factory()->for($project)->create();

    $this->actingAs($montageUser)
        ->post(route('montage.projects.works.complete', $project))
        ->assertRedirect(route('montage.projects.index'))
        ->assertSessionHas('status', 'Готовые работы отправлены модератору на проверку.');

    $stages = $project->fresh()
        ->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_MODERATION]->status)->toBe('in_progress');
});

test('montage users can not open foreign montage project', function () {
    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $anotherMontageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $anotherMontageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$anotherMontageUser->id]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.works.show', $project))
        ->assertNotFound();
});

test('montage users can see client feedback on works page', function () {
    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'montage_review_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$montageUser->id]);

    $asset = ProjectMontageAsset::factory()->for($project)->create([
        'original_name' => 'ready-1.jpg',
    ]);
    ProjectMontageRevisionRequest::factory()->create([
        'project_id' => $project->id,
        'project_montage_asset_id' => $asset->id,
        'comment' => 'Нужно поправить первую работу.',
    ]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.works.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('montage/projects/works')
            ->where('clientReview.requestedAssets.0.name', 'ready-1.jpg')
            ->where('clientReview.requestedAssets.0.comment', 'Нужно поправить первую работу.')
            ->where('montageAssets.0.requestedForRevision', true),
        );
});
