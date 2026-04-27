<?php

use App\Models\City;
use App\Models\Project;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use App\Support\ProjectSourceImagePreviewGenerator;
use App\Support\PublicStorageUrl;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Фотограф',
        'Модератор',
        'Монтажер',
        'Дизайнер',
        'Печать',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('moderators can view photographers with projects', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $city = City::factory()->create([
        'name' => 'Алматы',
    ]);

    $photographer = User::factory()->create([
        'name' => 'Первый фотограф',
        'city_id' => $city->id,
    ]);
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом 11 А',
        'class_name' => '11 А',
        'album_size' => '25x25',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/index')
            ->has('photographers', 1)
            ->has('cities', 1)
            ->where('filters.search', '')
            ->where('filters.cityId', null)
            ->where('photographers.0.id', $photographer->id)
            ->where('photographers.0.name', 'Первый фотограф')
            ->where('photographers.0.cityName', 'Алматы')
            ->where('photographers.0.projectsCount', 1),
        );
});

test('moderators can filter photographers by search query', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $matchingPhotographer = User::factory()->create([
        'name' => 'Алина Фотограф',
        'phone' => '+77010000011',
    ]);
    $matchingPhotographer->assignRole('Фотограф');
    Project::factory()->for($matchingPhotographer, 'photographer')->create();

    $otherPhotographer = User::factory()->create([
        'name' => 'Бекжан Камера',
        'phone' => '+77010000022',
    ]);
    $otherPhotographer->assignRole('Фотограф');
    Project::factory()->for($otherPhotographer, 'photographer')->create();

    $this->actingAs($moderator)
        ->get(route('moderator.projects.index', ['search' => 'Алина']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/index')
            ->has('photographers', 1)
            ->where('filters.search', 'Алина')
            ->where('photographers.0.id', $matchingPhotographer->id)
            ->where('photographers.0.name', 'Алина Фотограф'),
        );
});

test('moderators can filter photographers by city', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $almaty = City::factory()->create([
        'name' => 'Алматы',
    ]);
    $astana = City::factory()->create([
        'name' => 'Астана',
    ]);

    $almatyPhotographer = User::factory()->create([
        'name' => 'Алматинский фотограф',
        'city_id' => $almaty->id,
    ]);
    $almatyPhotographer->assignRole('Фотограф');
    Project::factory()->for($almatyPhotographer, 'photographer')->create();

    $astanaPhotographer = User::factory()->create([
        'name' => 'Астанинский фотограф',
        'city_id' => $astana->id,
    ]);
    $astanaPhotographer->assignRole('Фотограф');
    Project::factory()->for($astanaPhotographer, 'photographer')->create();

    $this->actingAs($moderator)
        ->get(route('moderator.projects.index', ['city_id' => $almaty->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/index')
            ->has('photographers', 1)
            ->where('filters.cityId', $almaty->id)
            ->where('photographers.0.id', $almatyPhotographer->id)
            ->where('photographers.0.cityName', 'Алматы'),
        );
});

test('moderators can open a photographer projects page', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create([
        'name' => 'Первый фотограф',
    ]);
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом 11 А',
        'class_name' => '11 А',
        'album_size' => '25x25',
    ]);
    $project->sourceImages()->createMany([
        [
            'path' => "project-source-images/{$project->id}/one.jpg",
            'original_name' => 'one.jpg',
            'size_bytes' => 123_456,
            'mime_type' => 'image/jpeg',
        ],
        [
            'path' => "project-source-images/{$project->id}/two.jpg",
            'original_name' => 'two.jpg',
            'size_bytes' => 76_544,
            'mime_type' => 'image/jpeg',
        ],
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.photographers.show', $photographer))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/photographer')
            ->where('photographer.id', $photographer->id)
            ->where('photographer.name', 'Первый фотограф')
            ->where('projects.0.id', $project->id)
            ->where('projects.0.name', 'Альбом 11 А')
            ->where('projects.0.albumSize', '25x25')
            ->where('projects.0.sourceImagesTotalSizeBytes', 200000)
            ->where('projects.0.currentStageName', 'Новый проект')
            ->where('projects.0.currentStageDisplayName', 'Подготовка проекта'),
        );
});

test('moderators can publish client selection link with deadline', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 2,
        'student_count' => 28,
    ]);
    $project->sourceImages()->createMany([
        [
            'path' => "project-source-images/{$project->id}/1.jpg",
            'original_name' => '1.jpg',
            'size_bytes' => 123_456,
            'mime_type' => 'image/jpeg',
        ],
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.publish', $project), [
            'selection_deadline_at' => now()->addDays(5)->toDateTimeString(),
        ])
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Клиентская ссылка сохранена. Ученики могут переходить по ней и отправлять свои анкеты.');

    $project->refresh();
    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($project->client_selection_token)->not()->toBeNull();
    expect($project->client_selection_published_at)->not()->toBeNull();
    expect($project->client_selection_deadline_at)->not()->toBeNull();
    expect($stages[ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION]->status)->toBe('in_progress');
});

test('non moderators can not open moderator project pages', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->get(route('moderator.projects.index'))
        ->assertForbidden();
});

test('moderators can update deadline after students already started submitting', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 1,
        'student_count' => 10,
        'client_selection_token' => 'token-123',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDay(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/1.jpg",
        'original_name' => '1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $submission = $project->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан Сарсен',
        'student_quote' => 'Мечтай смело.',
        'submitted_at' => now(),
    ]);
    $submission->selectedImages()->attach([$image->id]);

    $newDeadline = now()->addDays(5)->startOfMinute();

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.publish', $project), [
            'selection_deadline_at' => $newDeadline->toDateTimeString(),
        ])
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Клиентская ссылка сохранена. Ученики могут переходить по ней и отправлять свои анкеты.');

    expect($project->fresh()->client_selection_deadline_at?->toDateTimeString())
        ->toBe($newDeadline->toDateTimeString());
});

test('moderators can approve submitted client selection and send project to montage', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Демо Монтажер',
    ]);
    $montageUser->assignRole('Монтажер');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'approve-token-123',
        'client_selection_published_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/1.jpg",
        'original_name' => '1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $submission = $project->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан Сарсен',
        'student_quote' => 'Мечтай смело.',
        'submitted_at' => now(),
    ]);
    $submission->selectedImages()->attach([$image->id]);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.approve', $project), [
            'montage_user_id' => $montageUser->id,
        ])
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Выбор клиента подтвержден. Проект переведен на этап «Монтаж», назначен Демо Монтажер.');

    $project->refresh();
    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe('in_progress');
    expect($stages[ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->responsibleUsers->pluck('id')->all())
        ->toBe([$montageUser->id]);
    expect($project->fresh()->montage_user_id)->toBe($montageUser->id);
    expect($project->fresh()->designer_user_id)->toBeNull();
});

test('moderators can see selected client image preview urls', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'preview-token-123',
        'client_selection_published_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/preview.jpg",
        'original_name' => 'Аружан.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $submission = $project->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан',
        'student_quote' => 'Свети ярко.',
        'submitted_at' => now(),
    ]);
    $submission->selectedImages()->attach([$image->id]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('submissions.0.studentName', 'Аружан')
            ->where('submissions.0.studentQuote', 'Свети ярко.')
            ->where('submissions.0.selectedImages.0.url', PublicStorageUrl::make($image->path))
            ->where('submissions.0.selectedImages.0.previewUrl', PublicStorageUrl::make($image->path))
            ->where('submissions.0.selectedImages.0.name', 'Аружан.jpg'),
        );
});

test('moderators receive generated preview url for raw selected images', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'preview-token-raw-123',
        'client_selection_published_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);

    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/Aruzhan.raf",
        'original_name' => 'Аружан.raf',
        'size_bytes' => 123_456,
        'mime_type' => 'image/x-fuji-raf',
    ]);

    $submission = $project->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан',
        'student_quote' => 'Свети ярко.',
        'submitted_at' => now(),
    ]);
    $submission->selectedImages()->attach([$image->id]);

    $previewPath = "project-source-image-previews/{$image->id}.jpg";

    $previewGenerator = Mockery::mock(ProjectSourceImagePreviewGenerator::class);
    $previewGenerator
        ->shouldReceive('resolvePreviewPath')
        ->once()
        ->withArgs(fn ($sourceImage) => $sourceImage->id === $image->id)
        ->andReturn($previewPath);

    $this->app->instance(ProjectSourceImagePreviewGenerator::class, $previewGenerator);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('submissions.0.selectedImages.0.url', PublicStorageUrl::make($image->path))
            ->where('submissions.0.selectedImages.0.previewUrl', PublicStorageUrl::make($previewPath))
            ->where('submissions.0.selectedImages.0.name', 'Аружан.raf'),
        );
});

test('moderators can see available montage users on project page', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Монтажер Алина',
    ]);
    $montageUser->assignRole('Монтажер');
    $designer = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Дизайнер Тимур',
    ]);
    $designer->assignRole('Дизайнер');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('montageUsers.0.id', $montageUser->id)
            ->where('montageUsers.0.name', 'Монтажер Алина')
            ->where('designerUsers.0.id', $designer->id)
            ->where('designerUsers.0.name', 'Дизайнер Тимур'),
        );
});

test('moderator project page does not fail when designer role is missing', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Монтажер Арман',
    ]);
    $montageUser->assignRole('Монтажер');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    Role::query()
        ->where('name', 'Дизайнер')
        ->where('guard_name', 'web')
        ->delete();

    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('montageUsers.0.id', $montageUser->id)
            ->where('designerUsers', []),
        );
});

test('moderators can see that project needs designer assignment after montage is completed', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready-final.jpg",
        'original_name' => 'ready-final.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('project.currentStageSlug', ProjectStageDefinition::SLUG_MODERATION)
            ->where('project.canApproveModeration', false)
            ->where('project.selectedDesignerUserId', null)
            ->where('project.montageReviewPublishedAt', null),
        );
});

test('moderators can see that client confirmed ready works without revision requests', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');
    $designer = User::factory()->create([
        'approved_at' => now(),
    ]);
    $designer->assignRole('Дизайнер');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'designer_user_id' => $designer->id,
        'montage_review_token' => 'review-confirmed',
        'montage_review_published_at' => now(),
        'montage_review_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/confirmed-ready.jpg",
        'original_name' => 'confirmed-ready.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('project.currentStageSlug', ProjectStageDefinition::SLUG_MODERATION)
            ->where('project.montageReviewPublishedAt', fn ($value) => $value !== null)
            ->where('project.montageReviewSubmittedAt', fn ($value) => $value !== null)
            ->where('project.canApproveModeration', true)
            ->has('montageReview.requestedAssets', 0),
        );
});

test('moderators can not approve client selection before submit', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'approve-token-empty',
        'client_selection_published_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.approve', $project), [
            'montage_user_id' => $montageUser->id,
        ])
        ->assertSessionHasErrors([
            'project' => 'Пока нет ни одной клиентской анкеты для отправки на монтаж.',
        ]);
});

test('moderators must choose a montage user before sending project to montage', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'approve-token-required',
        'client_selection_published_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
    $project->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан Сарсен',
        'student_quote' => 'Мечтай смело.',
        'submitted_at' => now(),
    ]);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.approve', $project), [])
        ->assertSessionHasErrors(['montage_user_id']);
});

test('moderators can approve moderation and send project to printing', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $designer = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Демо Дизайнер',
    ]);
    $designer->assignRole('Дизайнер');

    $printUser = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Демо Печать',
    ]);
    $printUser->assignRole('Печать');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'designer_user_id' => $designer->id,
        'montage_review_published_at' => now(),
        'montage_review_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready-final.jpg",
        'original_name' => 'ready-final.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.moderation.approve', $project), [
            'print_user_id' => $printUser->id,
        ])
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Модерация подтверждена. Проект переведен на этап «Печать», назначен Демо Печать.');

    $stages = $project->fresh()
        ->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MODERATION]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_PRINTING]->status)->toBe('in_progress');
    expect($stages[ProjectStageDefinition::SLUG_PRINTING]->responsibleUsers->pluck('id')->all())
        ->toBe([$printUser->id]);
});

test('moderators can not send project to printing before client confirms ready works', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $designer = User::factory()->create([
        'approved_at' => now(),
    ]);
    $designer->assignRole('Дизайнер');

    $printUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $printUser->assignRole('Печать');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'designer_user_id' => $designer->id,
        'montage_review_published_at' => now(),
        'montage_review_submitted_at' => null,
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready-final.jpg",
        'original_name' => 'ready-final.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.moderation.approve', $project), [
            'print_user_id' => $printUser->id,
        ])
        ->assertSessionHasErrors([
            'project' => 'Клиент еще не подтвердил готовые работы.',
        ]);
});

test('moderators can see selected print user on project page after sending to printing', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $printUser = User::factory()->create([
        'approved_at' => now(),
        'name' => 'Демо Печать',
    ]);
    $printUser->assignRole('Печать');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail()
        ->responsibleUsers()
        ->sync([$printUser->id]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('project.currentStageSlug', ProjectStageDefinition::SLUG_PRINTING)
            ->where('project.selectedPrintUserName', 'Демо Печать')
            ->where('project.selectedPrintUserId', $printUser->id),
        );
});

test('moderators can complete project after print user marked printing as ready', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'printing_ready_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.printing.complete', $project))
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Проект отмечен как готовый. Работа по заказу завершена.');

    $printingStage = $project->fresh()
        ->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail();

    expect($printingStage->status)->toBe('completed');
    expect($printingStage->completed_at)->not()->toBeNull();
});

test('moderators can download ready work file', function () {
    Storage::fake('public');

    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    Storage::disk('public')->put("project-montage-assets/{$project->id}/moderator-ready.jpg", 'moderator-image');

    $asset = $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/moderator-ready.jpg",
        'original_name' => 'moderator-ready.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.ready-works.download', [$project, $asset]))
        ->assertOk()
        ->assertDownload('moderator-ready.jpg');
});

test('moderators can download ready works as archive', function () {
    Storage::fake('public');

    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    Storage::disk('public')->put("project-montage-assets/{$project->id}/moderator-ready-1.jpg", 'first-image');
    Storage::disk('public')->put("project-montage-assets/{$project->id}/moderator-ready-2.jpg", 'second-image');

    $project->montageAssets()->createMany([
        [
            'path' => "project-montage-assets/{$project->id}/moderator-ready-1.jpg",
            'original_name' => 'moderator-ready-1.jpg',
            'size_bytes' => 123_456,
            'mime_type' => 'image/jpeg',
        ],
        [
            'path' => "project-montage-assets/{$project->id}/moderator-ready-2.jpg",
            'original_name' => 'moderator-ready-2.jpg',
            'size_bytes' => 223_456,
            'mime_type' => 'image/jpeg',
        ],
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.ready-works.archive', $project))
        ->assertOk()
        ->assertDownload("project-{$project->id}-ready-works.zip");
});

test('moderators can see price, download links, and source images on project page', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'unit_price' => '4500.00',
        'total_price' => '90000.00',
        'print_quantity' => 20,
        'portrait_count' => 18,
        'student_count' => 24,
    ]);

    $sourceImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/cover.jpg",
        'original_name' => 'cover.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('project.unitPrice', '4500.00')
            ->where('project.totalPrice', '90000.00')
            ->where('project.printQuantity', 20)
            ->where('project.portraitCount', 18)
            ->where('project.studentCount', 24)
            ->where('project.downloads.projectArchiveUrl', route('moderator.projects.project.archive', $project))
            ->where('project.downloads.sourceImagesArchiveUrl', route('moderator.projects.source-images.archive', $project))
            ->where('project.downloads.readyWorksArchiveUrl', route('moderator.projects.ready-works.archive', $project))
            ->where('sourceImages.0.id', $sourceImage->id)
            ->where('sourceImages.0.name', 'cover.jpg')
            ->where('sourceImages.0.url', PublicStorageUrl::make($sourceImage->path))
            ->where('sourceImages.0.downloadUrl', route('moderator.projects.source-images.download', [$project, $sourceImage])),
        );
});

test('moderators can download source image file', function () {
    Storage::fake('public');

    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    Storage::disk('public')->put("project-source-images/{$project->id}/source-1.jpg", 'source-file');

    $sourceImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.source-images.download', [$project, $sourceImage]))
        ->assertOk()
        ->assertDownload('source-1.jpg');
});

test('moderators can download source images as archive', function () {
    Storage::fake('public');

    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    Storage::disk('public')->put("project-source-images/{$project->id}/source-1.jpg", 'source-file-one');
    Storage::disk('public')->put("project-source-images/{$project->id}/source-2.jpg", 'source-file-two');

    $project->sourceImages()->createMany([
        [
            'path' => "project-source-images/{$project->id}/source-1.jpg",
            'original_name' => 'source-1.jpg',
            'size_bytes' => 123_456,
            'mime_type' => 'image/jpeg',
        ],
        [
            'path' => "project-source-images/{$project->id}/source-2.jpg",
            'original_name' => 'source-2.jpg',
            'size_bytes' => 223_456,
            'mime_type' => 'image/jpeg',
        ],
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.source-images.archive', $project))
        ->assertOk()
        ->assertDownload("project-{$project->id}-source-images.zip");
});

test('moderators can download full project archive', function () {
    Storage::fake('public');

    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    Storage::disk('public')->put("project-source-images/{$project->id}/source.jpg", 'source-file');
    Storage::disk('public')->put("project-montage-assets/{$project->id}/ready.jpg", 'ready-file');
    Storage::disk('public')->put("project-design-files/{$project->id}/layout.pdf", 'design-file');

    $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source.jpg",
        'original_name' => 'source.jpg',
        'size_bytes' => 120_000,
        'mime_type' => 'image/jpeg',
    ]);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready.jpg",
        'original_name' => 'ready.jpg',
        'size_bytes' => 140_000,
        'mime_type' => 'image/jpeg',
    ]);
    $project->designFiles()->create([
        'path' => "project-design-files/{$project->id}/layout.pdf",
        'original_name' => 'layout.pdf',
        'size_bytes' => 80_000,
        'mime_type' => 'application/pdf',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.project.archive', $project))
        ->assertOk()
        ->assertDownload("project-{$project->id}-full-archive.zip");
});
