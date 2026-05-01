<?php

use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Фотограф',
        'Модератор',
        'Монтажер',
        'Дизайнер',
        'Печать',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('project stage tables contain the required columns', function () {
    expect(Schema::hasColumns('project_stage_definitions', [
        'id',
        'name',
        'slug',
        'sort_order',
        'is_active',
        'created_at',
        'updated_at',
    ]))->toBeTrue();

    expect(Schema::hasColumns('project_stages', [
        'id',
        'project_id',
        'project_stage_definition_id',
        'status',
        'completed_at',
        'created_at',
        'updated_at',
    ]))->toBeTrue();

    expect(Schema::hasColumns('project_stage_user', [
        'project_stage_id',
        'user_id',
        'created_at',
        'updated_at',
    ]))->toBeTrue();
});

test('projects receive the default realization stages when they are created', function () {
    $project = Project::factory()->create();

    $stages = $project->fresh()
        ->projectStages()
        ->with('stageDefinition')
        ->get()
        ->sortBy(fn (ProjectStage $stage): int => $stage->stageDefinition->sort_order)
        ->values();

    expect($stages)->toHaveCount(count(ProjectStageDefinition::DEFAULT_DEFINITIONS));
    expect($stages->pluck('stageDefinition.name')->all())->toBe(
        collect(ProjectStageDefinition::DEFAULT_DEFINITIONS)
            ->pluck('name')
            ->all(),
    );
    expect($stages->first()->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);
    expect($stages->skip(1)->pluck('status')->unique()->all())->toBe([ProjectStage::STATUS_PENDING]);
});

test('project stages can have responsible users assigned to them', function () {
    $project = Project::factory()->create();
    $stage = $project->projectStages()->firstOrFail();
    $users = User::factory()->count(2)->create();

    $stage->responsibleUsers()->sync($users->modelKeys());

    expect($stage->fresh()->responsibleUsers->pluck('id')->all())
        ->toEqualCanonicalizing($users->modelKeys());
});

test('project moves through the full realization workflow from creation to printing', function () {
    Storage::fake('s3');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $printUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $printUser->assignRole('Печать');
    $designer = User::factory()->create([
        'approved_at' => now(),
    ]);
    $designer->assignRole('Дизайнер');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'name' => 'Полный workflow',
        'portrait_count' => 2,
        'student_count' => 1,
    ]);

    $stages = $project->fresh()
        ->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);
    expect($stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->status)->toBe(ProjectStage::STATUS_PENDING);

    $this->actingAs($photographer)
        ->post(route('projects.source-images.store', $project), [
            'images' => [
                UploadedFile::fake()->image('source-1.jpg'),
                UploadedFile::fake()->image('source-2.jpg'),
            ],
        ])
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]));

    $this->actingAs($photographer)
        ->post(route('projects.source-images.complete', $project))
        ->assertRedirect(route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]));

    $project->refresh();
    $stages = $project->projectStages()->with('stageDefinition')->get()->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_NEW_PROJECT]->status)->toBe(ProjectStage::STATUS_COMPLETED);
    expect($stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);
    expect($project->sourceImages()->count())->toBe(2);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.publish', $project), [
            'selection_deadline_at' => now()->addDays(5)->toDateTimeString(),
        ])
        ->assertRedirect(route('moderator.projects.show', $project));

    $project->refresh();
    $stages = $project->projectStages()->with('stageDefinition')->get()->keyBy('stageDefinition.slug');
    $imageIds = $project->sourceImages()->orderBy('id')->pluck('id')->all();

    expect($project->client_selection_token)->not->toBeNull();
    expect($stages[ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT]->status)->toBe(ProjectStage::STATUS_COMPLETED);
    expect($stages[ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);

    $this->post(route('client.projects.submit', $project->client_selection_token), [
        'student_name' => 'Аружан Сарсен',
        'student_quote' => 'Мечтай смело.',
        'selected_image_ids' => [$imageIds[0], $imageIds[1]],
    ])
        ->assertRedirect(route('client.projects.show', $project->client_selection_token));

    $project->refresh();
    expect($project->client_selection_submitted_at)->not->toBeNull();

    $this->actingAs($moderator)
        ->post(route('moderator.projects.client-selection.approve', $project), [
            'montage_user_id' => $montageUser->id,
        ])
        ->assertRedirect(route('moderator.projects.show', $project));

    $project->refresh();
    $stages = $project->projectStages()->with(['stageDefinition', 'responsibleUsers'])->get()->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION]->status)->toBe(ProjectStage::STATUS_COMPLETED);
    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);
    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->responsibleUsers->pluck('id')->all())->toBe([$montageUser->id]);

    $this->actingAs($montageUser)
        ->post(route('montage.projects.works.store', $project), [
            'images' => [
                UploadedFile::fake()->image('ready-1.jpg'),
                UploadedFile::fake()->image('ready-2.jpg'),
            ],
        ])
        ->assertRedirect(route('montage.projects.works.show', $project));

    $this->actingAs($montageUser)
        ->post(route('montage.projects.works.complete', $project))
        ->assertRedirect(route('montage.projects.index'));

    $project->refresh();
    $stages = $project->projectStages()->with('stageDefinition')->get()->keyBy('stageDefinition.slug');

    expect($project->montageAssets()->count())->toBe(2);
    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe(ProjectStage::STATUS_COMPLETED);
    expect($stages[ProjectStageDefinition::SLUG_MODERATION]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.moderation.assign-designer', $project), [
            'designer_user_id' => $designer->id,
        ])
        ->assertRedirect(route('moderator.projects.show', $project));

    $project->refresh();
    $stages = $project->projectStages()->with(['stageDefinition', 'responsibleUsers'])->get()->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);
    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->responsibleUsers->pluck('id')->all())->toBe([$designer->id]);

    $this->actingAs($designer)
        ->post(route('montage.projects.works.complete', $project))
        ->assertRedirect(route('montage.projects.index'));

    $project->refresh();
    $stages = $project->projectStages()->with('stageDefinition')->get()->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe(ProjectStage::STATUS_COMPLETED);
    expect($stages[ProjectStageDefinition::SLUG_MODERATION]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.moderation.publish-client-review', $project))
        ->assertRedirect(route('moderator.projects.show', $project));

    $project->refresh();
    expect($project->montage_review_token)->not->toBeNull();
    expect($project->montage_review_published_at)->not->toBeNull();

    $this->post(route('client.montage-reviews.submit', $project->montage_review_token), [
        'comments' => [],
    ])->assertRedirect(route('client.montage-reviews.show', $project->montage_review_token));

    $project->refresh();
    expect($project->montage_review_submitted_at)->not->toBeNull();
    expect($project->montageRevisionRequests()->count())->toBe(0);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.moderation.approve', $project), [
            'print_user_id' => $printUser->id,
        ])
        ->assertRedirect(route('moderator.projects.show', $project));

    $project->refresh();
    $stages = $project->projectStages()->with(['stageDefinition', 'responsibleUsers'])->get()->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MODERATION]->status)->toBe(ProjectStage::STATUS_COMPLETED);
    expect($stages[ProjectStageDefinition::SLUG_PRINTING]->status)->toBe(ProjectStage::STATUS_IN_PROGRESS);
    expect($stages[ProjectStageDefinition::SLUG_PRINTING]->responsibleUsers->pluck('id')->all())->toBe([$printUser->id]);

    $this->actingAs($printUser)
        ->post(route('print.projects.complete', $project))
        ->assertRedirect(route('print.projects.index'));

    $project->refresh();

    expect($project->printing_ready_at)->not->toBeNull();
    expect($project->currentProjectStage()?->stageDefinition?->slug)->toBe(ProjectStageDefinition::SLUG_PRINTING);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.printing.complete', $project))
        ->assertRedirect(route('moderator.projects.show', $project));

    $project->refresh();
    $stages = $project->projectStages()->with('stageDefinition')->get()->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_PRINTING]->status)->toBe(ProjectStage::STATUS_COMPLETED);
    expect($stages[ProjectStageDefinition::SLUG_PRINTING]->completed_at)->not->toBeNull();
});
