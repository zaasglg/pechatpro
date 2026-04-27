<?php

use App\Models\Project;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Админ',
        'Фотограф',
        'Модератор',
        'Монтажер',
        'Печать',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('admins can see their own analytics on the dashboard', function () {
    $user = User::factory()->create();
    $user->assignRole('Админ');

    $pendingPhotographer = User::factory()->pendingApproval()->create();
    $pendingPhotographer->assignRole('Фотограф');

    $activePhotographer = User::factory()->create();
    $activePhotographer->assignRole('Фотограф');

    Project::factory()->for($activePhotographer, 'photographer')->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'admin')
            ->where('dashboard.admin.stats.totalProjects', 1)
            ->where('dashboard.admin.stats.activePhotographers', 1)
            ->where('dashboard.admin.stats.pendingPhotographers', 1),
        );
});

test('moderators receive photographer approval access in shared auth props', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $this->actingAs($moderator)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('auth.user.canApprovePhotographers', true),
        );
});

test('photographers do not receive photographer approval access in shared auth props', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('auth.user.canApprovePhotographers', false),
        );
});

test('photographers can see their analytics on the dashboard', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $projectNeedingUploads = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Школа 9 А',
        'class_name' => '9 А',
    ]);

    $projectWaitingForClient = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Школа 10 Б',
        'class_name' => '10 Б',
    ]);
    $projectWaitingForClient->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);

    $projectInProduction = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Школа 11 В',
        'class_name' => '11 В',
    ]);
    $projectInProduction->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);

    ProjectSourceImage::factory()->for($projectWaitingForClient)->count(2)->create();
    ProjectSourceImage::factory()->for($projectInProduction)->count(3)->create();

    $this->actingAs($photographer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'photographer')
            ->where('dashboard.photographer.stats.totalProjects', 3)
            ->where('dashboard.photographer.stats.totalSourceImages', 5)
            ->where('dashboard.photographer.stats.needsSourceUploads', 1)
            ->where('dashboard.photographer.stats.waitingForClient', 1)
            ->where('dashboard.photographer.stats.inProduction', 1)
            ->has('dashboard.photographer.stageBreakdown', 6)
            ->where('dashboard.photographer.stageBreakdown.0.name', 'Подготовка проекта')
            ->where('dashboard.photographer.stageBreakdown.0.count', 1)
            ->where('dashboard.photographer.recentProjects.0.name', 'Школа 11 В')
            ->where('dashboard.photographer.recentProjects.1.name', 'Школа 10 Б')
            ->where('dashboard.photographer.recentProjects.2.name', 'Школа 9 А'),
        );

    expect($projectNeedingUploads->fresh()->currentProjectStage()?->stageDefinition?->slug)
        ->toBe(ProjectStageDefinition::SLUG_NEW_PROJECT);
});

test('moderators can see their own analytics on the dashboard', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $projectWaitingForSetup = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом 9 А',
    ]);
    $projectWaitingForSetup->advanceToStage(ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT);

    $projectWaitingForApproval = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Альбом 11 Б',
    ]);
    $projectWaitingForApproval->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
    $projectWaitingForApproval->clientSelectionSubmissions()->create([
        'student_name' => 'Аружан Сарсен',
        'student_quote' => 'Мечтай смело.',
        'submitted_at' => now(),
    ]);

    $this->actingAs($moderator)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'moderator')
            ->where('dashboard.moderator.stats.photographersWithProjects', 1)
            ->where('dashboard.moderator.stats.waitingForSelectionSetup', 1)
            ->where('dashboard.moderator.stats.waitingForModerationDecision', 1)
            ->where('dashboard.moderator.recentProjects.0.name', 'Альбом 11 Б'),
        );
});

test('montage users can see assigned project analytics on the dashboard', function () {
    $montageUser = User::factory()->create();
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Монтажный проект',
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);
    $project->montageAssets()->create([
        'path' => 'project-montage-assets/test.jpg',
        'original_name' => 'test.jpg',
        'size_bytes' => 1024,
        'mime_type' => 'image/jpeg',
    ]);

    $montageStage = $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail();
    $montageStage->responsibleUsers()->sync([$montageUser->id]);

    $this->actingAs($montageUser)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'montage')
            ->where('dashboard.montage.stats.assignedProjects', 1)
            ->where('dashboard.montage.stats.activeMontage', 1)
            ->where('dashboard.montage.stats.uploadedWorks', 1)
            ->where('dashboard.montage.assignedProjectsList.0.name', 'Монтажный проект'),
        );
});

test('print users can see assigned print analytics on the dashboard', function () {
    $printUser = User::factory()->create();
    $printUser->assignRole('Печать');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Печатный проект',
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);
    $project->montageAssets()->create([
        'path' => 'project-montage-assets/print.jpg',
        'original_name' => 'print.jpg',
        'size_bytes' => 2048,
        'mime_type' => 'image/jpeg',
    ]);

    $printStage = $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
        ->firstOrFail();
    $printStage->responsibleUsers()->sync([$printUser->id]);

    $this->actingAs($printUser)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'print')
            ->where('dashboard.print.stats.assignedProjects', 1)
            ->where('dashboard.print.stats.waitingForPrint', 1)
            ->where('dashboard.print.stats.readyWorks', 1)
            ->where('dashboard.print.assignedProjectsList.0.name', 'Печатный проект'),
        );
});
