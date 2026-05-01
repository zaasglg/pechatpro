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
        'Дизайнер',
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

test('designers can access projects assigned to them for montage', function () {
    $designer = User::factory()->create([
        'approved_at' => now(),
    ]);
    $designer->assignRole('Дизайнер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Дизайн 11 Б',
        'class_name' => '11 Б',
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$designer->id]);

    $this->actingAs($designer)
        ->get(route('montage.projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('montage/projects/index')
            ->has('projects', 1)
            ->where('projects.0.id', $project->id)
            ->where('projects.0.name', 'Дизайн 11 Б'),
        );
});

test('montage users can open assigned montage works page', function () {
    Storage::fake('s3');

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
            ->where('clientSelection.selectedImagesCount', 0)
            ->where('workflow.currentStageSlug', ProjectStageDefinition::SLUG_MONTAGE)
            ->where('workflow.assignedRole', 'montage')
            ->where('workflow.canMarkReady', true)
            ->where('montageAssets.0.id', $asset->id)
            ->where('montageAssets.0.name', 'ready-1.jpg'),
        );
});

test('montage works page includes selected client photos archive metadata', function () {
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

    $sourceImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/selected.jpg",
        'original_name' => 'selected.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $submission = $project->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан Сарсен',
        'student_quote' => 'Мечтай смело.',
        'submitted_at' => now(),
    ]);
    $submission->selectedImages()->attach([$sourceImage->id]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.works.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('montage/projects/works')
            ->where('clientSelection.selectedImagesCount', 1)
            ->where('clientSelection.archiveUrl', route('montage.projects.client-selection.archive', $project)),
        );
});

test('montage users can upload ready works for assigned project', function () {
    Storage::fake('s3');

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

    $assets = $project->montageAssets()->get();

    expect($assets)->toHaveCount(2);

    foreach ($assets as $asset) {
        Storage::disk('s3')->assertExists($asset->path);
    }
});

test('montage users can upload raw and svg works for assigned project', function () {
    Storage::fake('s3');

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
                UploadedFile::fake()->create('ready-raw.raf', 12 * 1024, 'image/x-fuji-raf'),
                UploadedFile::fake()->create('ready-vector.svg', 512, 'image/svg+xml'),
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('montage.projects.works.show', $project))
        ->assertSessionHas('status', 'Готовые работы успешно загружены.');

    $assets = $project->montageAssets()->pluck('original_name')->all();

    expect($assets)->toContain('ready-raw.raf');
    expect($assets)->toContain('ready-vector.svg');
});

test('designers can upload raf works for assigned project', function () {
    Storage::fake('s3');

    $designer = User::factory()->create([
        'approved_at' => now(),
    ]);
    $designer->assignRole('Дизайнер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'designer_user_id' => $designer->id,
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$designer->id]);

    $response = $this->actingAs($designer)
        ->post(route('montage.projects.works.store', $project), [
            'images' => [
                UploadedFile::fake()->create('designer-ready.raf', 12 * 1024, 'image/x-fuji-raf'),
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('montage.projects.works.show', $project))
        ->assertSessionHas('status', 'Готовые работы успешно загружены.');

    expect($project->montageAssets()->pluck('original_name')->all())
        ->toContain('designer-ready.raf');
});

test('montage users can replace ready work that needs revision', function () {
    Storage::fake('s3');

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

    Storage::disk('s3')->put("project-montage-assets/{$project->id}/old-ready.jpg", 'old-file');

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
    Storage::disk('s3')->assertMissing("project-montage-assets/{$project->id}/old-ready.jpg");
    Storage::disk('s3')->assertExists($asset->path);
    expect($project->montageAssets()->count())->toBe(1);
});

test('montage users can replace ready work with raw file format', function () {
    Storage::fake('s3');

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

    Storage::disk('s3')->put("project-montage-assets/{$project->id}/old-ready.jpg", 'old-file');

    $asset = ProjectMontageAsset::factory()->for($project)->create([
        'path' => "project-montage-assets/{$project->id}/old-ready.jpg",
        'original_name' => 'old-ready.jpg',
        'mime_type' => 'image/jpeg',
    ]);

    ProjectMontageRevisionRequest::factory()->create([
        'project_id' => $project->id,
        'project_montage_asset_id' => $asset->id,
        'comment' => 'Заменить фото на RAW-версию.',
    ]);

    $response = $this->actingAs($montageUser)
        ->post(route('montage.projects.works.replace', [$project, $asset]), [
            'image' => UploadedFile::fake()->create('new-ready.raf', 14 * 1024, 'image/x-fuji-raf'),
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('montage.projects.works.show', $project))
        ->assertSessionHas('status', 'Готовая работа успешно заменена.');

    $asset->refresh();

    expect($asset->original_name)->toBe('new-ready.raf');
    expect($asset->path)->not->toBe("project-montage-assets/{$project->id}/old-ready.jpg");
    Storage::disk('s3')->assertMissing("project-montage-assets/{$project->id}/old-ready.jpg");
    Storage::disk('s3')->assertExists($asset->path);
});

test('montage users can download assigned ready work file', function () {
    Storage::fake('s3');

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

    Storage::disk('s3')->put("project-montage-assets/{$project->id}/ready-1.jpg", 'ready-image');

    $asset = ProjectMontageAsset::factory()->for($project)->create([
        'path' => "project-montage-assets/{$project->id}/ready-1.jpg",
        'original_name' => 'ready-1.jpg',
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.works.download', [$project, $asset]))
        ->assertOk()
        ->assertDownload('ready-1.jpg');
});

test('montage users can download assigned ready works as archive', function () {
    Storage::fake('s3');

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

    Storage::disk('s3')->put("project-montage-assets/{$project->id}/ready-1.jpg", 'first-image');
    Storage::disk('s3')->put("project-montage-assets/{$project->id}/ready-2.jpg", 'second-image');

    ProjectMontageAsset::factory()->for($project)->create([
        'path' => "project-montage-assets/{$project->id}/ready-1.jpg",
        'original_name' => 'ready-1.jpg',
    ]);
    ProjectMontageAsset::factory()->for($project)->create([
        'path' => "project-montage-assets/{$project->id}/ready-2.jpg",
        'original_name' => 'ready-2.jpg',
    ]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.works.archive', $project))
        ->assertOk()
        ->assertDownload("project-{$project->id}-ready-works.zip");
});

test('montage users can download selected client photos as archive', function () {
    Storage::fake('s3');

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

    Storage::disk('s3')->put("project-source-images/{$project->id}/selected-1.jpg", 'selected-1');
    Storage::disk('s3')->put("project-source-images/{$project->id}/selected-2.jpg", 'selected-2');

    $firstSourceImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/selected-1.jpg",
        'original_name' => 'selected-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $secondSourceImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/selected-2.jpg",
        'original_name' => 'selected-2.jpg',
        'size_bytes' => 223_456,
        'mime_type' => 'image/jpeg',
    ]);

    $submission = $project->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан Сарсен',
        'student_quote' => 'Мечтай смело.',
        'submitted_at' => now(),
    ]);
    $submission->selectedImages()->attach([
        $firstSourceImage->id,
        $secondSourceImage->id,
    ]);

    $this->actingAs($montageUser)
        ->get(route('montage.projects.client-selection.archive', $project))
        ->assertOk()
        ->assertDownload("project-{$project->id}-client-selection.zip");
});

test('montage users can send project to moderator after uploading ready works', function () {
    Storage::fake('s3');

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
        ->assertSessionHas('status', 'Работы монтажёра отправлены модератору для передачи дизайнеру.');

    $stages = $project->fresh()
        ->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_MODERATION]->status)->toBe('in_progress');
});

test('montage resend clears previous client revision requests for a new review cycle', function () {
    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'montage_review_token' => 'review-cycle-token',
        'montage_review_published_at' => now(),
        'montage_review_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$montageUser->id]);

    $asset = ProjectMontageAsset::factory()->for($project)->create([
        'original_name' => 'fixed-version.jpg',
    ]);

    ProjectMontageRevisionRequest::factory()->create([
        'project_id' => $project->id,
        'project_montage_asset_id' => $asset->id,
        'comment' => 'Исправить эту работу.',
    ]);

    $this->actingAs($montageUser)
        ->post(route('montage.projects.works.complete', $project))
        ->assertRedirect(route('montage.projects.index'))
        ->assertSessionHas('status', 'Работы монтажёра отправлены модератору для передачи дизайнеру.');

    $project->refresh();

    expect($project->montage_review_submitted_at)->toBeNull();
    expect($project->montageRevisionRequests()->count())->toBe(0);

    $this->get(route('client.montage-reviews.show', ['token' => 'review-cycle-token']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client/montage-reviews/show')
            ->where('project.reviewSubmittedAt', null)
            ->where('images.0.selectedForRevision', false)
            ->where('images.0.comment', null),
        );
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
