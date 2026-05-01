<?php

use App\Models\Project;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use App\Support\ProjectSourceImagePreviewGenerator;
use App\Support\PublicStorageUrl;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    Role::findOrCreate('Фотограф', 'web');
});

test('legacy source images url opens the project page on the source images tab', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Алматы 7 класс',
        'class_name' => '9 А',
    ]);

    $sourceImage = ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
    ]);

    $response = $this->actingAs($photographer)
        ->get(route('projects.source-images.show', $project))
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]));

    $this->actingAs($photographer)
        ->get($response->headers->get('Location'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/show')
            ->where('project.id', $project->id)
            ->where('project.name', 'Алматы 7 класс')
            ->where('initialTab', 'source-images')
            ->where('workflow.currentStageName', 'Новый проект')
            ->where('workflow.currentStageSlug', ProjectStageDefinition::SLUG_NEW_PROJECT)
            ->where('workflow.canMarkReady', true)
            ->has('sourceImages', 1)
            ->where('sourceImages.0.id', $sourceImage->id)
            ->where('sourceImages.0.name', 'source-1.jpg')
            ->where('sourceImages.0.sizeBytes', $sourceImage->size_bytes)
            ->where('sourceImages.0.mimeType', $sourceImage->mime_type)
            ->where('sourceImages.0.uploadedAt', $sourceImage->created_at?->toIso8601String()),
        );
});

test('project page exposes generated preview url for imagick-rasterized source images', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $rasterizedPath = "project-source-images/{$project->id}/preview-source.tiff";
    $temporaryTiffPath = tempnam(sys_get_temp_dir(), 'preview-source-');
    $imagick = new Imagick;

    $imagick->newImage(80, 80, '#44aa88');
    $imagick->setImageFormat('tiff');
    $imagick->writeImage($temporaryTiffPath);
    $imagick->clear();
    $imagick->destroy();

    Storage::disk('s3')->put($rasterizedPath, file_get_contents($temporaryTiffPath));
    @unlink($temporaryTiffPath);

    $sourceImage = ProjectSourceImage::factory()->for($project)->create([
        'path' => $rasterizedPath,
        'original_name' => 'preview-source.tiff',
        'mime_type' => 'image/tiff',
    ]);

    $previewPath = ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id);

    $this->actingAs($photographer)
        ->get(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('sourceImages.0.previewUrl', PublicStorageUrl::make($previewPath))
        );

    Storage::disk('s3')->assertExists($previewPath);
});

test('generator falls back to macos quick look when imagick can not rasterize a raw file', function () {
    Storage::fake('s3');

    $project = Project::factory()->create();
    $rawPath = "project-source-images/{$project->id}/preview-source.cr2";

    Storage::disk('s3')->put($rawPath, 'raw-binary');

    $sourceImage = ProjectSourceImage::factory()->for($project)->create([
        'path' => $rawPath,
        'original_name' => 'preview-source.CR2',
        'mime_type' => 'image/x-canon-cr2',
    ]);

    $generator = new class extends ProjectSourceImagePreviewGenerator
    {
        protected function generatePreviewWithImagick(string $absolutePath): ?string
        {
            throw new RuntimeException('delegate failed');
        }

        protected function generatePreviewWithMacOsQuickLook(string $absolutePath): ?string
        {
            return 'generated-preview';
        }
    };

    $previewPath = $generator->ensureGeneratedPreviewPath($sourceImage);

    expect($previewPath)->toBe(ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id));
    Storage::disk('s3')->assertExists($previewPath);
    expect(Storage::disk('s3')->get($previewPath))->toBe('generated-preview');
});

test('photographers can upload multiple source images to their project', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $response = $this->actingAs($photographer)
        ->post(route('projects.source-images.store', $project), [
            'images' => [
                UploadedFile::fake()->image('source-1.jpg'),
                UploadedFile::fake()->image('source-2.png'),
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]))
        ->assertSessionHas('status', 'Исходники успешно загружены.');

    $project->refresh();

    $sourceImages = $project->sourceImages()->get();

    expect($sourceImages)->toHaveCount(2);

    foreach ($sourceImages as $sourceImage) {
        Storage::disk('s3')->assertExists($sourceImage->path);
    }
});

test('photographers can upload non image source files to their project', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $response = $this->actingAs($photographer)
        ->post(route('projects.source-images.store', $project), [
            'images' => [
                UploadedFile::fake()->create(
                    'source-layout.psd',
                    512,
                    'application/octet-stream',
                ),
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]));

    $sourceFile = $project->sourceImages()->first();

    expect($sourceFile)->not->toBeNull();
    expect($sourceFile?->original_name)->toBe('source-layout.psd');
    expect($sourceFile?->mime_type)->toStartWith('application/');
    Storage::disk('s3')->assertExists($sourceFile->path);
});

test('photographers can upload source files larger than the old ten megabyte limit', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $response = $this->actingAs($photographer)
        ->post(route('projects.source-images.store', $project), [
            'images' => [
                UploadedFile::fake()->create(
                    'source-archive.zip',
                    12 * 1024,
                    'application/zip',
                ),
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]));

    $sourceFile = $project->sourceImages()->first();

    expect($sourceFile)->not->toBeNull();
    expect($sourceFile?->original_name)->toBe('source-archive.zip');
    expect($sourceFile?->mime_type)->toBe('application/zip');
    Storage::disk('s3')->assertExists($sourceFile->path);
});

test('photographers can delete their own source images', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $sourceImage = ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.cr2",
        'original_name' => 'source-1.CR2',
        'mime_type' => 'image/x-canon-cr2',
    ]);
    $previewPath = ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id);

    Storage::disk('s3')->put($sourceImage->path, 'source-binary');
    Storage::disk('s3')->put($previewPath, 'preview-binary');

    $this->actingAs($photographer)
        ->delete(route('projects.source-images.destroy', [
            'project' => $project,
            'sourceImage' => $sourceImage,
        ]))
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]))
        ->assertSessionHas('status', 'Исходник source-1.CR2 удален.');

    expect($project->sourceImages()->whereKey($sourceImage->id)->exists())->toBeFalse();
    Storage::disk('s3')->assertMissing($sourceImage->path);
    Storage::disk('s3')->assertMissing($previewPath);
});

test('photographers can not delete source images from another photographers project', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();
    $sourceImage = ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
    ]);

    Storage::disk('s3')->put($sourceImage->path, 'source-binary');

    $this->actingAs($photographer)
        ->delete(route('projects.source-images.destroy', [
            'project' => $project,
            'sourceImage' => $sourceImage,
        ]))
        ->assertNotFound();

    expect($project->sourceImages()->whereKey($sourceImage->id)->exists())->toBeTrue();
    Storage::disk('s3')->assertExists($sourceImage->path);
});

test('photographers can move project to photographer shot stage after confirming source images', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
    ]);

    $response = $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project));

    $response
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]))
        ->assertSessionHas('status', 'Проект переведен на этап "Фотограф снял".');

    $project->refresh();
    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->status)->toBe('in_progress');
});

test('legacy projects still allow confirming source images when the old active stage is photographer shot', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    ProjectSourceImage::factory()->for($project)->create([
        'path' => "project-source-images/{$project->id}/source-1.jpg",
        'original_name' => 'source-1.jpg',
    ]);

    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    $stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->update([
        'status' => 'pending',
        'completed_at' => null,
    ]);
    $stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->update([
        'status' => 'in_progress',
        'completed_at' => null,
    ]);

    $this->actingAs($photographer)
        ->get(route('projects.source-images.show', $project))
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]));

    $this->actingAs($photographer)
        ->get(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('workflow.canMarkReady', true)
            ->where('workflow.currentStageSlug', ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT),
        );

    $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project))
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]))
        ->assertSessionHas('status', 'Проект переведен на этап "Фотограф снял".');

    $project->refresh();
    $stages = $project->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->status)->toBe('completed');
    expect($stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->status)->toBe('in_progress');
});

test('photographers can not move project to photographer shot stage without source images', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project))
        ->assertSessionHasErrors([
            'images' => 'Сначала загрузите исходники.',
        ]);
});

test('photographers can not open another photographers source images page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->get(route('projects.source-images.show', $project))
        ->assertNotFound();
});

test('photographers can not upload images into another photographers project', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->post(route('projects.source-images.store', $project), [
            'images' => [
                UploadedFile::fake()->image('source-1.jpg'),
            ],
        ])
        ->assertNotFound();

    expect($project->sourceImages()->exists())->toBeFalse();
});

test('photographers can not complete source images stage for another photographers project', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $anotherPhotographer = User::factory()->create();
    $anotherPhotographer->assignRole('Фотограф');

    $project = Project::factory()->for($anotherPhotographer, 'photographer')->create();

    $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project))
        ->assertNotFound();
});
