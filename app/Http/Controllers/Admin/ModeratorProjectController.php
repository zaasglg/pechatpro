<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveProjectClientSelectionRequest;
use App\Http\Requests\StoreProjectClientSelectionConfigRequest;
use App\Models\Project;
use App\Models\ProjectClientSelectionSlot;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ModeratorProjectController extends Controller
{
    /**
     * User-friendly stage labels for moderator-facing project screens.
     *
     * @var array<string, string>
     */
    private const STAGE_DISPLAY_NAMES = [
        ProjectStageDefinition::SLUG_NEW_PROJECT => 'Подготовка проекта',
        ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT => 'Съёмка и загрузка исходников',
        ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION => 'Выбор фото клиентом',
        ProjectStageDefinition::SLUG_MONTAGE => 'Дизайн и монтаж',
        ProjectStageDefinition::SLUG_MODERATION => 'Проверка и согласование',
        ProjectStageDefinition::SLUG_PRINTING => 'Печать и выдача',
    ];

    public function index(Request $request): Response
    {
        $photographers = User::query()
            ->role('Фотограф')
            ->whereHas('projects')
            ->with('city:id,name')
            ->withCount('projects')
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'avatar_path', 'city_id'])
            ->map(fn (User $photographer): array => [
                'id' => $photographer->id,
                'name' => $photographer->name,
                'phone' => $photographer->phone,
                'avatar' => $photographer->avatar,
                'cityName' => $photographer->city?->name,
                'projectsCount' => $photographer->projects_count,
            ])
            ->values();

        return Inertia::render('moderator/projects/index', [
            'photographers' => $photographers,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function showPhotographer(User $photographer): Response
    {
        $photographer = User::query()
            ->role('Фотограф')
            ->whereKey($photographer->getKey())
            ->with('city:id,name')
            ->firstOrFail(['id', 'name', 'phone', 'avatar_path', 'city_id']);

        $projects = Project::query()
            ->whereBelongsTo($photographer, 'photographer')
            ->with([
                'projectStages.stageDefinition',
                'clientSelectionSlots:id,project_id',
            ])
            ->withCount('sourceImages')
            ->latest()
            ->get()
            ->map(function (Project $project): array {
                $project->ensureWorkflowState();
                $currentStage = $project->currentProjectStage();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'className' => $project->class_name,
                    'sourceImagesCount' => $project->source_images_count,
                    'currentStageName' => $currentStage?->stageDefinition?->name,
                    'currentStageDisplayName' => $currentStage?->stageDefinition?->slug !== null
                        ? (self::STAGE_DISPLAY_NAMES[$currentStage->stageDefinition->slug] ?? $currentStage->stageDefinition->name)
                        : null,
                    'currentStageSlug' => $currentStage?->stageDefinition?->slug,
                    'hasClientLink' => filled($project->client_selection_token),
                    'clientSlotsCount' => $project->clientSelectionSlots->count(),
                    'publishedAt' => $project->client_selection_published_at?->toIso8601String(),
                ];
            })
            ->values();

        return Inertia::render('moderator/projects/photographer', [
            'photographer' => [
                'id' => $photographer->id,
                'name' => $photographer->name,
                'phone' => $photographer->phone,
                'avatar' => $photographer->avatar,
                'cityName' => $photographer->city?->name,
                'projectsCount' => $projects->count(),
            ],
            'projects' => $projects,
            'status' => session('status'),
        ]);
    }

    public function show(Project $project): Response
    {
        $project->ensureWorkflowState();
        $project->load([
            'photographer:id,name,phone',
            'clientSelectionSlots.choices.sourceImage',
            'projectStages.stageDefinition',
            'projectStages.responsibleUsers:id,name',
            'montageAssets',
            'montageRevisionRequests.montageAsset',
        ]);
        $montageStage = $project->projectStages->first(
            fn (ProjectStage $stage): bool => $stage->stageDefinition?->slug === ProjectStageDefinition::SLUG_MONTAGE,
        );
        $printingStage = $project->projectStages->first(
            fn (ProjectStage $stage): bool => $stage->stageDefinition?->slug === ProjectStageDefinition::SLUG_PRINTING,
        );
        $montageUsers = User::query()
            ->role('Монтажер')
            ->whereNotNull('approved_at')
            ->orderBy('name')
            ->get(['id', 'name']);
        $printUsers = User::query()
            ->role('Печать')
            ->whereNotNull('approved_at')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('moderator/projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'photographerId' => $project->photographer?->id,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'coverType' => $project->cover_type,
                'photographerName' => $project->photographer?->name,
                'photographerPhone' => $project->photographer?->phone,
                'sourceImagesCount' => $project->sourceImages()->count(),
                'currentStageName' => $project->currentProjectStage()?->stageDefinition?->name,
                'currentStageSlug' => $project->currentProjectStage()?->stageDefinition?->slug,
                'clientSelectionLink' => filled($project->client_selection_token)
                    ? route('client.projects.show', ['token' => $project->client_selection_token])
                    : null,
                'clientSelectionPublishedAt' => $project->client_selection_published_at?->toIso8601String(),
                'clientSelectionSubmittedAt' => $project->client_selection_submitted_at?->toIso8601String(),
                'montageReviewLink' => filled($project->montage_review_token)
                    ? route('client.montage-reviews.show', ['token' => $project->montage_review_token])
                    : null,
                'montageReviewPublishedAt' => $project->montage_review_published_at?->toIso8601String(),
                'montageReviewSubmittedAt' => $project->montage_review_submitted_at?->toIso8601String(),
                'canApproveModeration' => $this->canApproveModeration($project),
                'printingReadyAt' => $project->printing_ready_at?->toIso8601String(),
                'selectedMontageUserId' => $montageStage?->responsibleUsers->first()?->id,
                'selectedMontageUserName' => $montageStage?->responsibleUsers->first()?->name,
                'selectedPrintUserId' => $printingStage?->responsibleUsers->first()?->id,
                'selectedPrintUserName' => $printingStage?->responsibleUsers->first()?->name,
            ],
            'slots' => $project->clientSelectionSlots
                ->map(fn (ProjectClientSelectionSlot $slot): array => [
                    'id' => $slot->id,
                    'name' => $slot->name,
                    'maxLikes' => $slot->max_likes,
                    'selectedCount' => $slot->choices->count(),
                    'selectedImages' => $slot->choices
                        ->filter(fn ($choice) => $choice->sourceImage !== null)
                        ->map(fn ($choice): array => [
                            'id' => $choice->sourceImage->id,
                            'name' => $choice->sourceImage->original_name,
                            'url' => Storage::disk('public')->url($choice->sourceImage->path),
                        ])
                        ->values()
                        ->all(),
                ])
                ->values()
                ->all(),
            'montageAssets' => $project->montageAssets
                ->map(fn (ProjectMontageAsset $asset): array => [
                    'id' => $asset->id,
                    'name' => $asset->original_name,
                    'url' => Storage::disk('public')->url($asset->path),
                    'requestedForRevision' => $project->montageRevisionRequests
                        ->contains('project_montage_asset_id', $asset->id),
                ])
                ->values()
                ->all(),
            'montageReview' => [
                'requestedAssets' => $project->montageRevisionRequests
                    ->filter(fn ($request) => $request->montageAsset !== null)
                    ->map(fn ($request): array => [
                        'id' => $request->montageAsset->id,
                        'name' => $request->montageAsset->original_name,
                        'comment' => $request->comment,
                    ])
                    ->values()
                    ->all(),
            ],
            'montageUsers' => $montageUsers
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])
                ->values()
                ->all(),
            'printUsers' => $printUsers
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])
                ->values()
                ->all(),
        ]);
    }

    private function canApproveModeration(Project $project): bool
    {
        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_MODERATION) {
            return false;
        }

        if (! $project->montageAssets->isNotEmpty()) {
            return false;
        }

        if ($project->montage_review_published_at === null) {
            return true;
        }

        return $project->montage_review_submitted_at !== null
            && $project->montageRevisionRequests->isEmpty();
    }

    public function publishSelection(
        StoreProjectClientSelectionConfigRequest $request,
        Project $project,
    ): RedirectResponse {
        $project->ensureWorkflowState();

        if (! $project->sourceImages()->exists()) {
            throw ValidationException::withMessages([
                'slots' => 'Сначала фотограф должен загрузить исходники.',
            ]);
        }

        if ($project->currentProjectStage()?->stageDefinition?->slug === ProjectStageDefinition::SLUG_NEW_PROJECT) {
            throw ValidationException::withMessages([
                'slots' => 'Сначала фотограф должен подтвердить этап с исходниками.',
            ]);
        }

        if ($project->clientSelectionSlots()->whereHas('choices')->exists()) {
            throw ValidationException::withMessages([
                'slots' => 'Клиент уже начал выбор. Изменение лимитов после начала выбора отключено.',
            ]);
        }

        DB::transaction(function () use ($project, $request): void {
            $project->clientSelectionSlots()->delete();

            $project->clientSelectionSlots()->createMany(
                collect($request->validated('slots'))
                    ->values()
                    ->map(fn (array $slot, int $index): array => [
                        'name' => $slot['name'],
                        'max_likes' => $slot['max_likes'],
                        'sort_order' => $index + 1,
                    ])
                    ->all(),
            );

            if (blank($project->client_selection_token)) {
                $project->forceFill([
                    'client_selection_token' => $this->generateClientSelectionToken(),
                ])->save();
            }

            if ($project->client_selection_published_at === null) {
                $project->forceFill([
                    'client_selection_published_at' => now(),
                    'client_selection_submitted_at' => null,
                ])->save();
            }

            $currentStageSlug = $project->currentProjectStage()?->stageDefinition?->slug;

            if ($currentStageSlug === ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT) {
                $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
            }
        });

        return to_route('moderator.projects.show', $project)
            ->with('status', 'Клиентская ссылка сохранена. Теперь клиент может выбрать фотографии.');
    }

    public function approveSelection(
        ApproveProjectClientSelectionRequest $request,
        Project $project,
    ): RedirectResponse {
        $project->ensureWorkflowState();
        $validated = $request->validated();

        if ($project->client_selection_submitted_at === null) {
            throw ValidationException::withMessages([
                'project' => 'Клиент еще не завершил выбор фотографий.',
            ]);
        }

        if (
            $project->currentProjectStage()?->stageDefinition?->slug
            !== ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION
        ) {
            throw ValidationException::withMessages([
                'project' => 'Этот проект уже переведен на следующий этап.',
            ]);
        }

        $montageUser = User::query()
            ->whereKey($validated['montage_user_id'])
            ->whereNotNull('approved_at')
            ->first();

        if ($montageUser === null || ! $montageUser->hasRole('Монтажер')) {
            throw ValidationException::withMessages([
                'montage_user_id' => 'Выберите действующего монтажёра.',
            ]);
        }

        DB::transaction(function () use ($project, $montageUser): void {
            $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);

            $montageStage = $project->projectStages()
                ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
                ->first();

            if ($montageStage !== null) {
                $montageStage->responsibleUsers()->sync([$montageUser->id]);
            }
        });

        return to_route('moderator.projects.show', $project)
            ->with('status', "Выбор клиента подтвержден. Проект переведен на этап «Монтаж», назначен {$montageUser->name}.");
    }

    private function generateClientSelectionToken(): string
    {
        do {
            $token = Str::random(40);
        } while (Project::query()->where('client_selection_token', $token)->exists());

        return $token;
    }
}
