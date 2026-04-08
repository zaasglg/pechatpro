<?php

use App\Models\Project;
use App\Models\ProjectClientSelectionChoice;
use App\Models\ProjectClientSelectionSlot;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    Role::findOrCreate('Фотограф', 'web');
});

test('guests can open published client selection page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом клиента',
        'client_selection_token' => 'client-token-123',
        'client_selection_published_at' => now(),
    ]);
    $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    ProjectClientSelectionSlot::factory()->for($project)->create([
        'name' => 'Главная обложка',
        'max_likes' => 1,
        'sort_order' => 1,
    ]);

    $this->get(route('client.projects.show', 'client-token-123'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client/projects/show')
            ->where('project.name', 'Альбом клиента')
            ->where('project.token', 'client-token-123')
            ->where('slots.0.name', 'Главная обложка')
            ->has('images', 1)
            ->where('images.0.name', 'source-1.jpg'),
        );
});

test('guests can toggle client selections inside configured limit', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'client-token-456',
        'client_selection_published_at' => now(),
    ]);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $slot = ProjectClientSelectionSlot::factory()->for($project)->create([
        'name' => 'Главная обложка',
        'max_likes' => 1,
        'sort_order' => 1,
    ]);

    $this->post(route('client.projects.toggle-selection', 'client-token-456'), [
        'slot_id' => $slot->id,
        'source_image_id' => $image->id,
    ])->assertRedirect();

    $choice = ProjectClientSelectionChoice::query()
        ->where('project_client_selection_slot_id', $slot->id)
        ->where('project_source_image_id', $image->id)
        ->first();

    expect($choice)->not()->toBeNull();

    $this->post(route('client.projects.toggle-selection', 'client-token-456'), [
        'slot_id' => $slot->id,
        'source_image_id' => $image->id,
    ])->assertRedirect();

    expect(
        ProjectClientSelectionChoice::query()
            ->where('project_client_selection_slot_id', $slot->id)
            ->where('project_source_image_id', $image->id)
            ->exists(),
    )->toBeFalse();
});

test('guests can not exceed moderator selection limit', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'client-token-789',
        'client_selection_published_at' => now(),
    ]);
    $firstImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $secondImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-2.jpg",
        'original_name' => 'source-2.jpg',
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
        'project_source_image_id' => $firstImage->id,
    ]);

    $this->from(route('client.projects.show', 'client-token-789'))
        ->post(route('client.projects.toggle-selection', 'client-token-789'), [
            'slot_id' => $slot->id,
            'source_image_id' => $secondImage->id,
        ])
        ->assertRedirect(route('client.projects.show', 'client-token-789'))
        ->assertSessionHasErrors([
            'source_image_id' => 'Для блока «Главная обложка» можно выбрать только 1 фото.',
        ]);
});

test('guests can not open unpublished client selection page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'hidden-token',
        'client_selection_published_at' => null,
    ]);

    $this->get(route('client.projects.show', 'hidden-token'))
        ->assertNotFound();
});

test('guests can submit completed client selection', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'client-submit-token',
        'client_selection_published_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);

    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
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

    $this->post(route('client.projects.submit', 'client-submit-token'))
        ->assertRedirect(route('client.projects.show', 'client-submit-token'))
        ->assertSessionHas('status', 'Выбор отправлен модератору. Теперь ожидайте подтверждения.');

    expect($project->refresh()->client_selection_submitted_at)->not()->toBeNull();
});

test('guests can not submit client selection until all slots are filled', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'client-submit-incomplete',
        'client_selection_published_at' => now(),
    ]);
    ProjectClientSelectionSlot::factory()->for($project)->create([
        'name' => 'Главная обложка',
        'max_likes' => 1,
        'sort_order' => 1,
    ]);

    $this->from(route('client.projects.show', 'client-submit-incomplete'))
        ->post(route('client.projects.submit', 'client-submit-incomplete'))
        ->assertRedirect(route('client.projects.show', 'client-submit-incomplete'))
        ->assertSessionHasErrors([
            'selection' => 'Заполните блок «Главная обложка». Нужно выбрать 1 фото.',
        ]);
});

test('guests can not change selection after final submit', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'client_selection_token' => 'client-submit-locked',
        'client_selection_published_at' => now(),
        'client_selection_submitted_at' => now(),
    ]);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $slot = ProjectClientSelectionSlot::factory()->for($project)->create([
        'name' => 'Главная обложка',
        'max_likes' => 1,
        'sort_order' => 1,
    ]);

    $this->from(route('client.projects.show', 'client-submit-locked'))
        ->post(route('client.projects.toggle-selection', 'client-submit-locked'), [
            'slot_id' => $slot->id,
            'source_image_id' => $image->id,
        ])
        ->assertRedirect(route('client.projects.show', 'client-submit-locked'))
        ->assertSessionHasErrors([
            'source_image_id' => 'Выбор уже отправлен модератору. Изменения больше недоступны.',
        ]);
});
