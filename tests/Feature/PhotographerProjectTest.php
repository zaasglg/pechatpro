<?php

use App\Models\Project;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use App\Support\ProjectSourceImagePreviewGenerator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Админ',
        'Фотограф',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('photographers can view only their own projects', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $ownProject = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом 11 А',
        'class_name' => '11 А',
    ]);
    $ownProject->sourceImages()->createMany([
        [
            'path' => "project-source-images/{$ownProject->id}/one.jpg",
            'original_name' => 'one.jpg',
            'size_bytes' => 120_000,
            'mime_type' => 'image/jpeg',
        ],
        [
            'path' => "project-source-images/{$ownProject->id}/two.jpg",
            'original_name' => 'two.jpg',
            'size_bytes' => 80_000,
            'mime_type' => 'image/jpeg',
        ],
    ]);

    Project::factory()->for($anotherPhotographer, 'photographer')->create([
        'name' => 'Чужой проект',
    ]);

    $this->actingAs($photographer)
        ->get(route('projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/index')
            ->has('projects', 1)
            ->where('projects.0.id', $ownProject->id)
            ->where('projects.0.name', 'Альбом 11 А')
            ->where('projects.0.className', '11 А')
            ->where('projects.0.sourceImagesTotalSizeBytes', 200000),
        );
});

test('photographers can open project creation page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->get(route('projects.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/create')
            ->where('classOptions', Project::CLASS_OPTIONS)
            ->where('albumTypes', Project::ALBUM_TYPES)
            ->where('albumSizes', Project::ALBUM_SIZES)
            ->where('coverTypesByAlbumType', Project::COVER_TYPES_BY_ALBUM_TYPE)
            ->where('pageCountOptionsByAlbumType', Project::PAGE_COUNT_OPTIONS_BY_ALBUM_TYPE)
            ->has('albumPricingRules', 16)
            ->has('portraitPricingRules', 6)
            ->where('albumPricingRules.0.coverPrice', 700)
            ->where('albumPricingRules.0.pagePrice', 500)
            ->where('portraitPricingRules.0.portraitCount', 2)
            ->where('portraitPricingRules.0.extraPrice', 500),
        );
});

test('photographers can open their project detail page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Алматы 7 класс',
        'class_name' => '9 А',
        'album_type' => 'Пластик',
        'album_size' => '20x20',
        'cover_type' => 'Твердый',
        'page_count' => 18,
        'portrait_count' => 6,
        'student_count' => 24,
        'print_quantity' => 26,
        'client_selection_token' => 'client-selection-token',
        'client_selection_published_at' => now(),
        'client_selection_deadline_at' => now()->addDays(3),
        'montage_review_token' => 'montage-review-token',
        'montage_review_published_at' => now()->subHour(),
    ]);
    $completedStage = $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_NEW_PROJECT))
        ->first();
    $completedAt = now()->subHour()->startOfMinute();

    $completedStage?->update([
        'status' => 'completed',
        'completed_at' => $completedAt,
    ]);

    $this->actingAs($photographer)
        ->get(route('projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/show')
            ->where('project.id', $project->id)
            ->where('project.name', 'Алматы 7 класс')
            ->where('project.className', '9 А')
            ->where('project.albumType', 'Пластик')
            ->where('project.albumSize', '20x20')
            ->where('project.coverType', 'Твердый')
            ->where('project.pageCount', 18)
            ->where('project.portraitCount', 6)
            ->where('project.studentCount', 24)
            ->where('project.printQuantity', 26)
            ->where('initialTab', 'details')
            ->has('sourceImages', 0),
        )
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.clientSelectionLink', route('client.projects.show', ['token' => 'client-selection-token']))
            ->where('project.clientSelectionDeadlineAt', $project->client_selection_deadline_at?->toIso8601String())
            ->where('project.clientSelectionPublishedAt', $project->client_selection_published_at?->toIso8601String())
            ->where('project.clientSelectionSubmittedAt', null)
            ->where('project.montageReviewLink', route('client.montage-reviews.show', ['token' => 'montage-review-token']))
            ->where('project.montageReviewPublishedAt', $project->montage_review_published_at?->toIso8601String()),
        )
        ->assertInertia(fn (Assert $page) => $page
            ->has('stages', 6)
            ->where('stages.0.name', 'Новый проект')
            ->where('stages.0.displayName', 'Подготовка проекта')
            ->where('stages.0.status', 'completed')
            ->where('stages.0.completedAt', $completedAt->toIso8601String())
            ->where('stages.1.name', 'Фотограф снял')
            ->where('stages.1.displayName', 'Съёмка и загрузка исходников')
            ->where('stages.1.status', 'in_progress')
            ->where('stages.1.completedAt', null)
            ->where('stages.2.name', 'Выбор фотки от клиента')
            ->where('stages.2.displayName', 'Выбор фото клиентом')
            ->where('stages.2.completedAt', null)
            ->where('stages.3.name', 'Монтаж')
            ->where('stages.3.displayName', 'Дизайн и монтаж')
            ->where('stages.3.completedAt', null)
            ->where('stages.4.name', 'Модерация')
            ->where('stages.4.displayName', 'Проверка и согласование')
            ->where('stages.4.completedAt', null)
            ->where('stages.5.name', 'Печать')
            ->where('stages.5.displayName', 'Печать и выдача')
            ->where('stages.5.completedAt', null),
        );
});

test('photographers can not open another photographers project detail page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->get(route('projects.show', $project))
        ->assertNotFound();
});

test('photographers can create projects', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');
    $designFile = UploadedFile::fake()->create(
        'album-layout.indd',
        120,
        'application/octet-stream',
    );

    $this->actingAs($photographer)
        ->post(route('projects.store'), [
            'name' => 'Папка 11 класса',
            'class_name' => 'Садик',
            'album_type' => 'Кожаный',
            'album_size' => '30x30',
            'cover_type' => 'Кожаный',
            'page_count' => 10,
            'portrait_count' => 7,
            'student_count' => 31,
            'print_quantity' => 35,
            'design_file' => $designFile,
        ])
        ->assertRedirect(route('projects.index'))
        ->assertSessionHas('status', 'Проект Папка 11 класса создан.');

    $project = Project::query()->firstOrFail();
    $storedDesignFile = $project->designFiles()->first();

    expect($project->photographer_id)->toBe($photographer->id);
    expect($project->name)->toBe('Папка 11 класса');
    expect($project->class_name)->toBe('Садик');
    expect($project->portrait_count)->toBe(7);
    expect((float) $project->unit_price)->toBe(15000.0);
    expect((float) $project->total_price)->toBe(525000.0);
    expect($storedDesignFile)->not->toBeNull();
    expect($storedDesignFile?->original_name)->toBe('album-layout.indd');
    expect($storedDesignFile?->mime_type)->toBe('application/octet-stream');
    Storage::disk('public')->assertExists($storedDesignFile->path);
});

test('photographers can create projects without price records in database', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $designFile = UploadedFile::fake()->create(
        'album-layout.indd',
        120,
        'application/octet-stream',
    );

    $this->actingAs($photographer)
        ->post(route('projects.store'), [
            'name' => 'Проект без базы цен',
            'class_name' => '11 класс',
            'album_type' => 'Журнал',
            'album_size' => '20x30',
            'cover_type' => 'Твердый',
            'page_count' => 20,
            'portrait_count' => 3,
            'student_count' => 31,
            'print_quantity' => 35,
            'design_file' => $designFile,
        ])
        ->assertRedirect(route('projects.index'))
        ->assertSessionHas('status', 'Проект Проект без базы цен создан.');

    $project = Project::query()->latest('id')->firstOrFail();

    expect((float) $project->unit_price)->toBe(5100.0);
    expect((float) $project->total_price)->toBe(178500.0);
});

test('photographers can not create leather albums with unsupported cover type', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->from(route('projects.create'))
        ->post(route('projects.store'), [
            'name' => 'Кожаный с ошибкой',
            'class_name' => '9 класс',
            'album_type' => 'Кожаный',
            'album_size' => '20x20',
            'cover_type' => 'Твердый',
            'page_count' => 10,
            'portrait_count' => 7,
            'student_count' => 20,
            'print_quantity' => 20,
        ])
        ->assertRedirect(route('projects.create'))
        ->assertSessionHasErrors(['cover_type']);
});

test('photographers can not create journal albums with unsupported page counts', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->from(route('projects.create'))
        ->post(route('projects.store'), [
            'name' => 'Журнал с ошибкой',
            'class_name' => 'Универ/Колледж',
            'album_type' => 'Журнал',
            'album_size' => '25x25',
            'cover_type' => 'Твердый',
            'page_count' => 18,
            'portrait_count' => 7,
            'student_count' => 25,
            'print_quantity' => 25,
        ])
        ->assertRedirect(route('projects.create'))
        ->assertSessionHasErrors(['page_count']);
});

test('photographers can not specify more than seven portraits', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->from(route('projects.create'))
        ->post(route('projects.store'), [
            'name' => 'Слишком много портреток',
            'class_name' => '11 класс',
            'album_type' => 'Кожаный',
            'album_size' => '25x25',
            'cover_type' => 'Кожаный',
            'page_count' => 10,
            'portrait_count' => 8,
            'student_count' => 25,
            'print_quantity' => 25,
        ])
        ->assertRedirect(route('projects.create'))
        ->assertSessionHasErrors(['portrait_count']);
});

test('photographers can delete their own projects', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Удаляемый проект',
    ]);
    $sourceImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 12345,
        'mime_type' => 'image/jpeg',
    ]);
    $project->designFiles()->create([
        'path' => "project-design-files/{$project->id}/layout.ai",
        'original_name' => 'layout.ai',
        'size_bytes' => 54321,
        'mime_type' => 'application/octet-stream',
    ]);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready-1.jpg",
        'original_name' => 'ready-1.jpg',
        'size_bytes' => 23456,
        'mime_type' => 'image/jpeg',
    ]);
    Storage::disk('public')->put("project-design-files/{$project->id}/layout.ai", 'design');
    Storage::disk('public')->put("project-source-images/{$project->id}/source-1.jpg", 'source');
    Storage::disk('public')->put(
        ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id),
        'preview',
    );
    Storage::disk('public')->put("project-montage-assets/{$project->id}/ready-1.jpg", 'montage');

    $this->actingAs($photographer)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect(route('projects.index'))
        ->assertSessionHas('status', 'Проект Удаляемый проект удален.');

    expect(Project::query()->whereKey($project->id)->exists())->toBeFalse();
    Storage::disk('public')->assertMissing("project-design-files/{$project->id}/layout.ai");
    Storage::disk('public')->assertMissing("project-source-images/{$project->id}/source-1.jpg");
    Storage::disk('public')->assertMissing(
        ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id),
    );
    Storage::disk('public')->assertMissing("project-montage-assets/{$project->id}/ready-1.jpg");
});

test('photographers can not delete another photographers project', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->delete(route('projects.destroy', $project))
        ->assertNotFound();
});

test('non photographers can not manage photographer projects', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $this->actingAs($admin)
        ->get(route('projects.index'))
        ->assertForbidden();
});
