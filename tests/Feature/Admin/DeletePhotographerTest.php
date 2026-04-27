<?php

use App\Models\Project;
use App\Models\User;
use App\Support\ProjectSourceImagePreviewGenerator;
use Illuminate\Support\Facades\Storage;
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

test('admins can delete photographers with their related files and projects', function () {
    Storage::fake('public');

    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $photographer = User::factory()->create([
        'name' => 'Удаляемый фотограф',
        'avatar_path' => 'avatars/deletable-photographer.jpg',
    ]);
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->designFiles()->create([
        'path' => "project-design-files/{$project->id}/design.psd",
        'original_name' => 'design.psd',
        'size_bytes' => 98_765,
        'mime_type' => 'application/octet-stream',
    ]);
    $sourceImage = $project->sourceImages()->create([
        'path' => "project-source-images/{$project->id}/1.jpg",
        'original_name' => '1.jpg',
        'size_bytes' => 123_456,
        'mime_type' => 'image/jpeg',
    ]);
    $project->montageAssets()->create([
        'path' => "project-montage-assets/{$project->id}/ready.jpg",
        'original_name' => 'ready.jpg',
        'mime_type' => 'image/jpeg',
        'size_bytes' => 456_789,
    ]);

    Storage::disk('public')->put('avatars/deletable-photographer.jpg', 'avatar');
    Storage::disk('public')->put("project-design-files/{$project->id}/design.psd", 'design');
    Storage::disk('public')->put("project-source-images/{$project->id}/1.jpg", 'source');
    Storage::disk('public')->put(
        ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id),
        'preview',
    );
    Storage::disk('public')->put("project-montage-assets/{$project->id}/ready.jpg", 'montage');

    $this->actingAs($admin)
        ->from(route('admin.photographer-approvals.index'))
        ->delete(route('admin.photographers.destroy', $photographer))
        ->assertRedirect(route('admin.photographer-approvals.index'))
        ->assertSessionHas('status', 'Фотограф Удаляемый фотограф удален.');

    $this->assertModelMissing($photographer);
    $this->assertModelMissing($project);
    Storage::disk('public')->assertMissing('avatars/deletable-photographer.jpg');
    Storage::disk('public')->assertMissing("project-design-files/{$project->id}/design.psd");
    Storage::disk('public')->assertMissing("project-source-images/{$project->id}/1.jpg");
    Storage::disk('public')->assertMissing(
        ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id),
    );
    Storage::disk('public')->assertMissing("project-montage-assets/{$project->id}/ready.jpg");
});

test('moderators can delete photographers and return back to photographer list', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create([
        'name' => 'Фотограф для удаления',
    ]);
    $photographer->assignRole('Фотограф');

    Project::factory()->for($photographer, 'photographer')->create();

    $this->actingAs($moderator)
        ->from(route('moderator.projects.index'))
        ->delete(route('admin.photographers.destroy', $photographer))
        ->assertRedirect(route('moderator.projects.index'))
        ->assertSessionHas('status', 'Фотограф Фотограф для удаления удален.');

    $this->assertModelMissing($photographer);
});

test('photographer delete route returns not found for non photographer users', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Админ');

    $montageUser = User::factory()->create();
    $montageUser->assignRole('Монтажер');

    $this->actingAs($admin)
        ->delete(route('admin.photographers.destroy', $montageUser))
        ->assertNotFound();
});
