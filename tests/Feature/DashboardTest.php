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
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated non photographers can visit the dashboard', function () {
    $user = User::factory()->create();
    $user->assignRole('Админ');

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.role', 'default'),
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
            ->where('dashboard.photographer.stageBreakdown.0.name', 'Новый проект')
            ->where('dashboard.photographer.stageBreakdown.0.count', 1)
            ->where('dashboard.photographer.recentProjects.0.name', 'Школа 11 В')
            ->where('dashboard.photographer.recentProjects.1.name', 'Школа 10 Б')
            ->where('dashboard.photographer.recentProjects.2.name', 'Школа 9 А'),
        );

    expect($projectNeedingUploads->fresh()->currentProjectStage()?->stageDefinition?->slug)
        ->toBe(ProjectStageDefinition::SLUG_NEW_PROJECT);
});
