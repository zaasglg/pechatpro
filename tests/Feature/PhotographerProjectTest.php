<?php

use App\Models\Project;
use App\Models\User;
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
            ->where('projects.0.className', '11 А'),
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
            ->where('pageCountOptionsByAlbumType', Project::PAGE_COUNT_OPTIONS_BY_ALBUM_TYPE),
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
        'student_count' => 24,
        'print_quantity' => 26,
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
            ->where('project.studentCount', 24)
            ->where('project.printQuantity', 26),
        )
        ->assertInertia(fn (Assert $page) => $page
            ->has('stages', 6)
            ->where('stages.0.name', 'Новый проект')
            ->where('stages.0.displayName', 'Подготовка проекта')
            ->where('stages.0.status', 'in_progress')
            ->where('stages.1.name', 'Фотограф снял')
            ->where('stages.1.displayName', 'Съёмка и загрузка исходников')
            ->where('stages.1.status', 'pending')
            ->where('stages.2.name', 'Выбор фотки от клиента')
            ->where('stages.2.displayName', 'Выбор фото клиентом')
            ->where('stages.3.name', 'Монтаж')
            ->where('stages.3.displayName', 'Дизайн и монтаж')
            ->where('stages.4.name', 'Модерация')
            ->where('stages.4.displayName', 'Проверка и согласование')
            ->where('stages.5.name', 'Печать')
            ->where('stages.5.displayName', 'Печать и выдача'),
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
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->post(route('projects.store'), [
            'name' => 'Папка 11 класса',
            'class_name' => '11 класс',
            'album_type' => 'Кожаный',
            'album_size' => '30x30',
            'cover_type' => 'Твердый',
            'page_count' => 10,
            'student_count' => 31,
            'print_quantity' => 35,
        ])
        ->assertRedirect(route('projects.index'))
        ->assertSessionHas('status', 'Проект Папка 11 класса создан.');

    $project = Project::query()->firstOrFail();

    expect($project->photographer_id)->toBe($photographer->id);
    expect($project->name)->toBe('Папка 11 класса');
});

test('photographers can not create plastic albums with hard cover', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->from(route('projects.create'))
        ->post(route('projects.store'), [
            'name' => 'Пластик с ошибкой',
            'class_name' => '9 класс',
            'album_type' => 'Пластик',
            'album_size' => '20x20',
            'cover_type' => 'Твердый',
            'page_count' => 10,
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
            'student_count' => 25,
            'print_quantity' => 25,
        ])
        ->assertRedirect(route('projects.create'))
        ->assertSessionHasErrors(['page_count']);
});

test('photographers can delete their own projects', function () {
    Storage::fake('public');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Удаляемый проект',
    ]);
    $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
        'size_bytes' => 12345,
        'mime_type' => 'image/jpeg',
    ]);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready-1.jpg",
        'original_name' => 'ready-1.jpg',
        'size_bytes' => 23456,
        'mime_type' => 'image/jpeg',
    ]);
    Storage::disk('public')->put("project-source-images/{$project->id}/source-1.jpg", 'source');
    Storage::disk('public')->put("project-montage-assets/{$project->id}/ready-1.jpg", 'montage');

    $this->actingAs($photographer)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect(route('projects.index'))
        ->assertSessionHas('status', 'Проект Удаляемый проект удален.');

    expect(Project::query()->whereKey($project->id)->exists())->toBeFalse();
    Storage::disk('public')->assertMissing("project-source-images/{$project->id}/source-1.jpg");
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
