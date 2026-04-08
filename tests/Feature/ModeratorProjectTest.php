<?php

use App\Models\Project;
use App\Models\ProjectClientSelectionChoice;
use App\Models\ProjectClientSelectionSlot;
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
        'Модератор',
        'Монтажер',
        'Печать',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('moderators can view photographers with projects', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create([
        'name' => 'Первый фотограф',
    ]);
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом 11 А',
        'class_name' => '11 А',
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/index')
            ->has('photographers', 1)
            ->where('photographers.0.id', $photographer->id)
            ->where('photographers.0.name', 'Первый фотограф')
            ->where('photographers.0.projectsCount', 1),
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
            ->where('projects.0.currentStageName', 'Новый проект')
            ->where('projects.0.currentStageDisplayName', 'Подготовка проекта'),
        );
});

test('moderators can configure client selection slots and publish link', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
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
            'slots' => [
                [
                    'name' => 'Главная обложка',
                    'max_likes' => 1,
                ],
                [
                    'name' => 'Вторая страница',
                    'max_likes' => 2,
                ],
            ],
        ])
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Клиентская ссылка сохранена. Теперь клиент может выбрать фотографии.');

    $project->refresh();
    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($project->client_selection_token)->not()->toBeNull();
    expect($project->client_selection_published_at)->not()->toBeNull();
    expect($project->clientSelectionSlots)->toHaveCount(2);
    expect($stages[ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION]->status)->toBe('in_progress');
});

test('non moderators can not open moderator project pages', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->get(route('moderator.projects.index'))
        ->assertForbidden();
});

test('moderators can not change limits after client already started selection', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'token-123',
        'client_selection_published_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/1.jpg",
        'original_name' => '1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $slot = ProjectClientSelectionSlot::factory()->for($project)->create([
        'name' => 'Главная обложка',
        'max_likes' => 1,
        'sort_order' => 1,
    ]);
    ProjectClientSelectionChoice::factory()->create([
        'project_client_selection_slot_id' => $slot->id,
        'project_source_image_id' => $image->id,
    ]);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.publish', $project), [
            'slots' => [
                [
                    'name' => 'Новая обложка',
                    'max_likes' => 2,
                ],
            ],
        ])
        ->assertSessionHasErrors([
            'slots' => 'Клиент уже начал выбор. Изменение лимитов после начала выбора отключено.',
        ]);
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
        'client_selection_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/1.jpg",
        'original_name' => '1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $slot = ProjectClientSelectionSlot::factory()->for($project)->create([
        'name' => 'Главная обложка',
        'max_likes' => 1,
        'sort_order' => 1,
    ]);
    ProjectClientSelectionChoice::factory()->create([
        'project_client_selection_slot_id' => $slot->id,
        'project_source_image_id' => $image->id,
    ]);

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
        'original_name' => 'preview.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $slot = ProjectClientSelectionSlot::factory()->for($project)->create([
        'name' => 'Главная обложка',
        'max_likes' => 1,
        'sort_order' => 1,
    ]);
    ProjectClientSelectionChoice::factory()->create([
        'project_client_selection_slot_id' => $slot->id,
        'project_source_image_id' => $image->id,
    ]);

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('slots.0.selectedImages.0.url', Storage::disk('public')->url($image->path))
            ->where('slots.0.selectedImages.0.name', 'preview.jpg'),
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

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $this->actingAs($moderator)
        ->get(route('moderator.projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('moderator/projects/show')
            ->where('montageUsers.0.id', $montageUser->id)
            ->where('montageUsers.0.name', 'Монтажер Алина'),
        );
});

test('moderators can see that project is ready to send to printing before client review is published', function () {
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
            ->where('project.canApproveModeration', true)
            ->where('project.montageReviewPublishedAt', null),
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
        'client_selection_submitted_at' => null,
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.approve', $project), [
            'montage_user_id' => $montageUser->id,
        ])
        ->assertSessionHasErrors([
            'project' => 'Клиент еще не завершил выбор фотографий.',
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
        'client_selection_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.approve', $project), [])
        ->assertSessionHasErrors(['montage_user_id']);
});

test('moderators can approve moderation and send project to printing', function () {
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
