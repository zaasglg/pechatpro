<?php

use App\Models\Project;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use App\Support\ProjectSourceImagePreviewGenerator;
use App\Support\PublicStorageUrl;
use Illuminate\Support\Facades\DB;
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
        'portrait_count' => 3,
        'student_count' => 28,
        'client_selection_token' => 'client-token-123',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);
    $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->get(route('client.projects.show', 'client-token-123'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client/projects/show')
            ->where('project.name', 'Альбом клиента')
            ->where('project.token', 'client-token-123')
            ->where('project.portraitCount', 3)
            ->where('project.studentCount', 28)
            ->where('project.submittedStudentsCount', 0)
            ->where('selection.selectedImageIds', [])
            ->has('images', 1)
            ->where('images.0.name', 'source-1.jpg')
            ->where(
                'images.0.previewUrl',
                PublicStorageUrl::make("project-source-images/{$project->id}/source-1.jpg"),
            )
            ->where('images.0.isTaken', false)
            ->where('images.0.isReserved', false)
            ->where('images.0.isSelected', false),
        );
});

test('client selection page returns generated preview url for raw files', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 2,
        'student_count' => 20,
        'client_selection_token' => 'client-token-raw',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.raf",
        'original_name' => 'source-1.raf',
        'size_bytes' => 123_456,
        'mime_type' => 'image/x-fuji-raf',
    ]);

    $previewPath = "project-source-image-previews/{$image->id}.jpg";

    $previewGenerator = Mockery::mock(ProjectSourceImagePreviewGenerator::class);
    $previewGenerator
        ->shouldReceive('resolvePreviewPath')
        ->once()
        ->withArgs(fn ($sourceImage) => $sourceImage->id === $image->id)
        ->andReturn($previewPath);

    $this->app->instance(ProjectSourceImagePreviewGenerator::class, $previewGenerator);

    $this->get(route('client.projects.show', 'client-token-raw'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client/projects/show')
            ->where('images.0.name', 'source-1.raf')
            ->where('images.0.previewUrl', PublicStorageUrl::make($previewPath))
            ->where('images.0.mimeType', 'image/x-fuji-raf'),
        );
});

test('client selection page shares toast flash data for inertia', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом клиента',
        'portrait_count' => 3,
        'student_count' => 28,
        'client_selection_token' => 'client-token-toast',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);

    $this->withSession([
        'toast' => [
            'message' => 'Анкета отправлена. Теперь ссылкой может воспользоваться следующий ученик.',
            'type' => 'success',
        ],
    ])->get(route('client.projects.show', 'client-token-toast'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client/projects/show')
            ->where('flash.toast.message', 'Анкета отправлена. Теперь ссылкой может воспользоваться следующий ученик.')
            ->where('flash.toast.type', 'success'),
        );
});

test('selected photo is reserved for current session and unavailable for others', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 1,
        'student_count' => 5,
        'client_selection_token' => 'client-reserve-token',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/reserved.jpg",
        'original_name' => 'reserved.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->post(route('client.projects.toggle-image-selection', 'client-reserve-token'), [
        'image_id' => $image->id,
    ])
        ->assertRedirect(route('client.projects.show', 'client-reserve-token'));

    $this->assertDatabaseHas('project_client_selection_reservations', [
        'project_id' => $project->id,
        'project_source_image_id' => $image->id,
    ]);

    DB::table('project_client_selection_reservations')
        ->where('project_id', $project->id)
        ->where('project_source_image_id', $image->id)
        ->update([
            'session_id' => 'another-student-session',
            'expires_at' => now()->addMinutes(10),
        ]);

    $this->get(route('client.projects.show', 'client-reserve-token'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selection.selectedImageIds', [])
            ->where('images.0.isSelected', false)
            ->where('images.0.isReserved', true),
        );

    $this->from(route('client.projects.show', 'client-reserve-token'))
        ->post(route('client.projects.toggle-image-selection', 'client-reserve-token'), [
            'image_id' => $image->id,
        ])
        ->assertRedirect(route('client.projects.show', 'client-reserve-token'))
        ->assertSessionHasErrors([
            'selected_image_ids' => 'Эту фотографию сейчас выбирает другой ученик. Выберите другой кадр.',
        ]);
});

test('guests can submit their questionnaire with exact portrait count', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 2,
        'student_count' => 2,
        'client_selection_token' => 'client-submit-token',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);

    $imageIds = $project->sourceImages()->createMany([
        [
            'path' => "project-source-images/{$project->id}/source-1.jpg",
            'original_name' => 'source-1.jpg',
            'size_bytes' => 123_456,
            'mime_type' => 'image/jpeg',
        ],
        [
            'path' => "project-source-images/{$project->id}/source-2.CR2",
            'original_name' => 'source-2.CR2',
            'size_bytes' => 123_456,
            'mime_type' => 'image/x-canon-cr2',
        ],
    ])->pluck('id')->all();

    $this->post(route('client.projects.submit', 'client-submit-token'), [
        'first_name' => '  Аружан  ',
        'last_name' => '  Сарсен  ',
        'student_quote' => 'Мечтай смело.',
        'selected_image_ids' => $imageIds,
    ])
        ->assertRedirect(route('client.projects.show', 'client-submit-token'))
        ->assertSessionHas(
            'status',
            'Анкета отправлена. Теперь ссылкой может воспользоваться следующий ученик.',
        );

    $submission = $project->fresh()
        ->clientSelectionSubmissions()
        ->with('selectedImages')
        ->first();

    expect($submission)->not()->toBeNull();
    expect($submission?->student_name)->toBe('Сарсен Аружан');
    expect($submission?->student_quote)->toBe('Мечтай смело.');
    expect($submission?->selectedImages->pluck('id')->all())
        ->toEqualCanonicalizing($imageIds);
    expect(
        $project->fresh()
            ->sourceImages()
            ->whereKey($imageIds)
            ->orderBy('id')
            ->get(['original_name', 'client_name', 'client_quote'])
            ->toArray(),
    )->toBe([
        [
            'original_name' => 'сарсен_аружан_1.jpg',
            'client_name' => 'Сарсен Аружан',
            'client_quote' => 'Мечтай смело.',
        ],
        [
            'original_name' => 'сарсен_аружан_2.CR2',
            'client_name' => 'Сарсен Аружан',
            'client_quote' => 'Мечтай смело.',
        ],
    ]);
    expect($project->fresh()->client_selection_submitted_at)->toBeNull();
});

test('selection link closes when student limit is reached', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 1,
        'student_count' => 1,
        'client_selection_token' => 'client-submit-final',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);

    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->post(route('client.projects.submit', 'client-submit-final'), [
        'first_name' => 'Аружан',
        'last_name' => 'Сарсен',
        'student_quote' => 'Мечтай смело.',
        'selected_image_ids' => [$image->id],
    ])
        ->assertRedirect(route('client.projects.show', 'client-submit-final'))
        ->assertSessionHas(
            'status',
            'Анкета отправлена. Лимит учеников заполнен.',
        );

    expect($project->fresh()->client_selection_submitted_at)->not()->toBeNull();
});

test('guests can not submit fewer or more photos than portrait limit', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 2,
        'client_selection_token' => 'client-submit-invalid-count',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);

    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->from(route('client.projects.show', 'client-submit-invalid-count'))
        ->post(route('client.projects.submit', 'client-submit-invalid-count'), [
            'first_name' => 'Аружан',
            'last_name' => 'Сарсен',
            'student_quote' => 'Мечтай смело.',
            'selected_image_ids' => [$image->id],
        ])
        ->assertRedirect(route('client.projects.show', 'client-submit-invalid-count'))
        ->assertSessionHasErrors(['selected_image_ids']);
});

test('guests can not submit photos from another project', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 1,
        'client_selection_token' => 'client-submit-foreign-image',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);
    $foreignProject = Project::factory()->for($photographer, 'photographer')->create();

    $foreignImage = $foreignProject->sourceImages()->create([
        'path' => "project-source-images/{$foreignProject->id}/foreign.jpg",
        'original_name' => 'foreign.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->from(route('client.projects.show', 'client-submit-foreign-image'))
        ->post(route('client.projects.submit', 'client-submit-foreign-image'), [
            'first_name' => 'Аружан',
            'last_name' => 'Сарсен',
            'student_quote' => 'Мечтай смело.',
            'selected_image_ids' => [$foreignImage->id],
        ])
        ->assertRedirect(route('client.projects.show', 'client-submit-foreign-image'))
        ->assertSessionHasErrors([
            'selected_image_ids' => 'Можно выбирать только фотографии из текущего проекта.',
        ]);
});

test('guests can not submit already taken photos', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 1,
        'student_count' => 3,
        'client_selection_token' => 'client-submit-taken-image',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
    ]);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/taken.jpg",
        'original_name' => 'taken.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $existingSubmission = $project->clientSelectionSubmissions()->create([
        'student_name' => 'Первый ученик',
        'student_quote' => 'Первая цитата',
        'submitted_at' => now(),
    ]);
    $existingSubmission->selectedImages()->attach([$image->id]);

    $this->from(route('client.projects.show', 'client-submit-taken-image'))
        ->post(route('client.projects.submit', 'client-submit-taken-image'), [
            'first_name' => 'Второй',
            'last_name' => 'Ученик',
            'student_quote' => 'Вторая цитата',
            'selected_image_ids' => [$image->id],
        ])
        ->assertRedirect(route('client.projects.show', 'client-submit-taken-image'))
        ->assertSessionHasErrors([
            'selected_image_ids' => 'Некоторые фотографии уже выбрал другой ученик. Обновите страницу и выберите другие.',
        ]);
});

test('guests can not submit after student limit is reached', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 1,
        'student_count' => 1,
        'client_selection_token' => 'client-submit-locked',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
        'client_selection_submitted_at' => now(),
    ]);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $project->clientSelectionSubmissions()->create([
        'student_name' => 'Первый ученик',
        'student_quote' => 'Первая цитата',
        'submitted_at' => now(),
    ]);

    $this->from(route('client.projects.show', 'client-submit-locked'))
        ->post(route('client.projects.submit', 'client-submit-locked'), [
            'first_name' => 'Второй',
            'last_name' => 'Ученик',
            'student_quote' => 'Новая цитата',
            'selected_image_ids' => [$image->id],
        ])
        ->assertRedirect(route('client.projects.show', 'client-submit-locked'))
        ->assertSessionHasErrors([
            'submission' => 'Лимит учеников для этой ссылки уже заполнен.',
        ]);
});

test('guests can not submit client selection after deadline passes', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'portrait_count' => 1,
        'client_selection_token' => 'client-expired-token',
        'client_selection_published_at' => now()->subDays(2),
        'client_selection_deadline_at' => now()->subHour(),
    ]);
    $image = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);

    $this->from(route('client.projects.show', 'client-expired-token'))
        ->post(route('client.projects.submit', 'client-expired-token'), [
            'first_name' => 'Аружан',
            'last_name' => 'Сарсен',
            'student_quote' => 'Мечтай смело.',
            'selected_image_ids' => [$image->id],
        ])
        ->assertRedirect(route('client.projects.show', 'client-expired-token'))
        ->assertSessionHasErrors([
            'submission' => 'Срок выбора фотографий истек. Обратитесь к модератору за новой ссылкой или продлением.',
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
