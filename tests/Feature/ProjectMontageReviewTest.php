<?php

use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectMontageRevisionRequest;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

    collect([
        'Фотограф',
        'Модератор',
        'Монтажер',
    ])->each(fn (string $role) => Role::findOrCreate($role, 'web'));
});

test('moderators can publish ready works review link for client', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create();
    $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);
    ProjectMontageAsset::factory()->for($project)->create();

    $this->actingAs($moderator)
        ->post(route('moderator.projects.moderation.publish-client-review', $project))
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Ссылка на готовые работы опубликована для клиента.');

    $project->refresh();

    expect($project->montage_review_token)->not()->toBeNull();
    expect($project->montage_review_published_at)->not()->toBeNull();
    expect($project->montage_review_submitted_at)->toBeNull();
});

test('clients can open published ready works review page', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'montage_review_token' => 'montage-review-token',
        'montage_review_published_at' => now(),
    ]);
    $asset = ProjectMontageAsset::factory()->for($project)->create([
        'original_name' => 'ready-1.jpg',
    ]);

    $this->get(route('client.montage-reviews.show', ['token' => $project->montage_review_token]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client/montage-reviews/show')
            ->where('project.id', $project->id)
            ->where('project.token', 'montage-review-token')
            ->where('images.0.id', $asset->id)
            ->where('images.0.name', 'ready-1.jpg')
            ->where('images.0.selectedForRevision', false)
            ->where('images.0.comment', null),
        );
});

test('clients can submit montage revision requests with separate comments for each work', function () {
    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'montage_review_token' => 'montage-review-submit',
        'montage_review_published_at' => now(),
    ]);
    $firstAsset = ProjectMontageAsset::factory()->for($project)->create();
    $secondAsset = ProjectMontageAsset::factory()->for($project)->create();

    $this->post(route('client.montage-reviews.toggle-selection', ['token' => $project->montage_review_token]), [
        'asset_id' => $firstAsset->id,
    ])->assertSessionHas('status', 'Работа отмечена для правки.');

    $this->post(route('client.montage-reviews.toggle-selection', ['token' => $project->montage_review_token]), [
        'asset_id' => $secondAsset->id,
    ])->assertSessionHas('status', 'Работа отмечена для правки.');

    $this->post(route('client.montage-reviews.submit', ['token' => $project->montage_review_token]), [
        'comments' => [
            (string) $firstAsset->id => 'Увеличить логотип и сместить текст чуть выше.',
            (string) $secondAsset->id => 'Сделать фото светлее и уменьшить отступ сверху.',
        ],
    ])
        ->assertRedirect(route('client.montage-reviews.show', ['token' => $project->montage_review_token]))
        ->assertSessionHas('status', 'Замечания отправлены модератору.');

    $project->refresh();

    expect($project->montage_review_submitted_at)->not()->toBeNull();
    expect($project->montage_review_comment)->toBeNull();
    expect(ProjectMontageRevisionRequest::query()
        ->where('project_id', $project->id)
        ->where('project_montage_asset_id', $firstAsset->id)
        ->value('comment'))->toBe('Увеличить логотип и сместить текст чуть выше.');
    expect(ProjectMontageRevisionRequest::query()
        ->where('project_id', $project->id)
        ->where('project_montage_asset_id', $secondAsset->id)
        ->value('comment'))->toBe('Сделать фото светлее и уменьшить отступ сверху.');
});

test('moderators can send project back to montage with client feedback', function () {
    $moderator = User::factory()->create();
    $moderator->assignRole('Модератор');

    $montageUser = User::factory()->create([
        'approved_at' => now(),
    ]);
    $montageUser->assignRole('Монтажер');

    $photographer = User::factory()->create();
    $photographer->assignRole('Фотограф');

    $project = Project::factory()->for($photographer, 'photographer')->create([
        'montage_review_token' => 'montage-review-back',
        'montage_review_published_at' => now(),
        'montage_review_submitted_at' => now(),
    ]);
    $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);

    $montageStage = $project->projectStages()
        ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
        ->firstOrFail();
    $montageStage->responsibleUsers()->sync([$montageUser->id]);

    $asset = ProjectMontageAsset::factory()->for($project)->create();
    ProjectMontageRevisionRequest::factory()->create([
        'project_id' => $project->id,
        'project_montage_asset_id' => $asset->id,
        'comment' => 'Исправить обложку.',
    ]);

    $this->actingAs($moderator)
        ->post(route('moderator.projects.moderation.send-back-to-montage', $project))
        ->assertRedirect(route('moderator.projects.show', $project))
        ->assertSessionHas('status', 'Проект возвращен на монтаж. Замечания клиента переданы монтажёру.');

    $stages = $project->fresh()
        ->projectStages()
        ->with('stageDefinition')
        ->get()
        ->keyBy('stageDefinition.slug');

    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->status)->toBe('in_progress');
    expect($stages[ProjectStageDefinition::SLUG_MONTAGE]->responsibleUsers->pluck('id')->all())
        ->toBe([$montageUser->id]);
});
