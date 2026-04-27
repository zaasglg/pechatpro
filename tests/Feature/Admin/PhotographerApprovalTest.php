<?php

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
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('admins can view photographers waiting for approval', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $pendingPhotographer = User::factory()->pendingApproval()->create([
        'name' => 'Новый Фотограф',
        'phone' => '+77017778811',
        'instagram_url' => 'https://instagram.com/new.photographer',
    ]);
    $pendingPhotographer->assignRole('Фотограф');

    $approvedPhotographer = User::factory()->create();
    $approvedPhotographer->assignRole('Фотограф');

    $pendingModerator = User::factory()->pendingApproval()->create();
    $pendingModerator->assignRole('Модератор');

    $this->actingAs($admin)
        ->get(route('admin.photographer-approvals.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/photographer-approvals/index')
            ->has('pendingPhotographers', 1)
            ->where('pendingPhotographers.0.id', $pendingPhotographer->id)
            ->where('pendingPhotographers.0.name', 'Новый Фотограф')
            ->where('pendingPhotographers.0.phone', '+77017778811')
            ->where('pendingPhotographers.0.instagramUrl', 'https://instagram.com/new.photographer'),
        );
});

test('non admins can not open photographer approvals page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $this->actingAs($photographer)
        ->get(route('admin.photographer-approvals.index'))
        ->assertForbidden();
});

test('moderators can view photographers waiting for approval', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $pendingPhotographer = User::factory()->pendingApproval()->create([
        'name' => 'Фотограф На Проверке',
        'phone' => '+77017778812',
        'instagram_url' => 'https://instagram.com/pending.photographer',
    ]);
    $pendingPhotographer->assignRole('Фотограф');

    $this->actingAs($moderator)
        ->get(route('admin.photographer-approvals.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/photographer-approvals/index')
            ->has('pendingPhotographers', 1)
            ->where('pendingPhotographers.0.id', $pendingPhotographer->id)
            ->where('pendingPhotographers.0.name', 'Фотограф На Проверке')
            ->where('pendingPhotographers.0.phone', '+77017778812')
            ->where('pendingPhotographers.0.instagramUrl', 'https://instagram.com/pending.photographer'),
        );
});

test('admins can approve pending photographers', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $pendingPhotographer = User::factory()->pendingApproval()->create();
    $pendingPhotographer->assignRole('Фотограф');

    $this->actingAs($admin)
        ->post(route('admin.photographer-approvals.approve', $pendingPhotographer))
        ->assertRedirect(route('admin.photographer-approvals.index'))
        ->assertSessionHas('status', "Фотограф {$pendingPhotographer->name} подтвержден.");

    expect($pendingPhotographer->fresh()->isApproved())->toBeTrue();
});

test('moderators can approve pending photographers', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $pendingPhotographer = User::factory()->pendingApproval()->create();
    $pendingPhotographer->assignRole('Фотограф');

    $this->actingAs($moderator)
        ->post(route('admin.photographer-approvals.approve', $pendingPhotographer))
        ->assertRedirect(route('admin.photographer-approvals.index'))
        ->assertSessionHas('status', "Фотограф {$pendingPhotographer->name} подтвержден.");

    expect($pendingPhotographer->fresh()->isApproved())->toBeTrue();
});

test('irrelevant roles can not open photographer approvals page', function () {
    $montageUser = User::factory()->create();
    $montageUser->assignRole('Монтажер');

    $this->actingAs($montageUser)
        ->get(route('admin.photographer-approvals.index'))
        ->assertForbidden();
});
