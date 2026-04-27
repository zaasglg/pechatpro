<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveProjectClientSelectionRequest;
use App\Http\Requests\StoreProjectClientSelectionConfigRequest;
use App\Models\City;
use App\Models\Project;
use App\Models\ProjectClientSelectionSubmission;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use App\Support\ProjectMontageAssetPreviewGenerator;
use App\Support\ProjectSourceImagePreviewGenerator;
use App\Support\PublicStorageUrl;
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
    private const MONTAGE_ROLE = 'Монтажер';

    private const DESIGNER_ROLE = 'Дизайнер';

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
        $search = trim((string) $request->string('search'));
        $cityId = $request->integer('city_id') ?: null;

        $photographersQuery = User::query()
            ->role('Фотограф')
            ->whereHas('projects')
            ->with('city:id,name')
            ->withCount('projects')
            ->withSum('projects as projects_total_price', 'total_price')
            ->orderBy('name');

        if ($search !== '') {
            $photographersQuery->where(function ($query) use ($search): void {
                $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($cityId !== null) {
            $photographersQuery->where('city_id', $cityId);
        }

        $photographers = $photographersQuery
            ->get(['id', 'name', 'phone', 'avatar_path', 'city_id'])
            ->map(fn (User $photographer): array => [
                'id' => $photographer->id,
                'name' => $photographer->name,
                'phone' => $photographer->phone,
                'avatar' => $photographer->avatar,
                'cityName' => $photographer->city?->name,
                'projectsCount' => $photographer->projects_count,
                'projectsTotalPrice' => $photographer->projects_total_price !== null
                    ? (string) $photographer->projects_total_price
                    : null,
            ])
            ->values();

        $cities = City::query()
            ->whereHas('users.roles', fn ($query) => $query->where('name', 'Фотограф'))
            ->whereHas('users.projects')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (City $city): array => [
                'id' => $city->id,
                'name' => $city->name,
            ])
            ->values();

        return Inertia::render('moderator/projects/index', [
            'photographers' => $photographers,
            'cities' => $cities,
            'filters' => [
                'search' => $search,
                'cityId' => $cityId,
            ],
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
            ])
            ->withCount('clientSelectionSubmissions')
            ->withCount('sourceImages')
            ->withSum('sourceImages as source_images_total_size', 'size_bytes')
            ->latest()
            ->get()
            ->map(function (Project $project): array {
                $project->ensureWorkflowState();
                $currentStage = $project->currentProjectStage();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'className' => $project->class_name,
                    'albumSize' => $project->album_size,
                    'sourceImagesCount' => $project->source_images_count,
                    'sourceImagesTotalSizeBytes' => (int) ($project->source_images_total_size ?? 0),
                    'totalPrice' => $project->total_price !== null ? (string) $project->total_price : null,
                    'currentStageName' => $currentStage?->stageDefinition?->name,
                    'currentStageDisplayName' => $currentStage?->stageDefinition?->slug !== null
                        ? (self::STAGE_DISPLAY_NAMES[$currentStage->stageDefinition->slug] ?? $currentStage->stageDefinition->name)
                        : null,
                    'currentStageSlug' => $currentStage?->stageDefinition?->slug,
                    'hasClientLink' => filled($project->client_selection_token),
                    'clientResponsesCount' => $project->client_selection_submissions_count,
                    'publishedAt' => $project->client_selection_published_at?->toIso8601String(),
                    'deadlineAt' => $project->client_selection_deadline_at?->toIso8601String(),
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

    public function show(
        Project $project,
        ProjectSourceImagePreviewGenerator $previewGenerator,
        ProjectMontageAssetPreviewGenerator $montagePreviewGenerator,
    ): Response {
        $project->ensureWorkflowState();
        $project->load([
            'photographer:id,name,phone',
            'montageUser:id,name',
            'designerUser:id,name',
            'clientSelectionSubmissions.selectedImages',
            'projectStages.stageDefinition',
            'projectStages.responsibleUsers:id,name',
            'montageAssets',
            'montageRevisionRequests.montageAsset',
        ]);
        $submittedStudentsCount = $project->clientSelectionSubmissions->count();
        $montageStage = $project->projectStages->first(
            fn (ProjectStage $stage): bool => $stage->stageDefinition?->slug === ProjectStageDefinition::SLUG_MONTAGE,
        );
        $printingStage = $project->projectStages->first(
            fn (ProjectStage $stage): bool => $stage->stageDefinition?->slug === ProjectStageDefinition::SLUG_PRINTING,
        );
        $selectedPrintUser = $project->projectStages()
            ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
            ->with('responsibleUsers:id,name')
            ->first()?->responsibleUsers->first();
        $montageUsers = User::query()
            ->whereHas('roles', fn ($query) => $query
                ->where('name', self::MONTAGE_ROLE)
                ->where('guard_name', 'web'))
            ->whereNotNull('approved_at')
            ->orderBy('name')
            ->get(['id', 'name']);
        $designerUsers = User::query()
            ->whereHas('roles', fn ($query) => $query
                ->where('name', self::DESIGNER_ROLE)
                ->where('guard_name', 'web'))
            ->whereNotNull('approved_at')
            ->orderBy('name')
            ->get(['id', 'name']);
        $printUsers = User::query()
            ->whereHas('roles', fn ($query) => $query
                ->where('name', 'Печать')
                ->where('guard_name', 'web'))
            ->whereNotNull('approved_at')
            ->orderBy('name')
            ->get(['id', 'name']);
        $sourceImages = $project->sourceImages()
            ->latest('id')
            ->get();

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
                'designFilesCount' => $project->designFiles()->count(),
                'currentStageName' => $project->currentProjectStage()?->stageDefinition?->name,
                'currentStageSlug' => $project->currentProjectStage()?->stageDefinition?->slug,
                'clientSelectionLink' => filled($project->client_selection_token)
                    ? route('client.projects.show', ['token' => $project->client_selection_token])
                    : null,
                'clientSelectionPublishedAt' => $project->client_selection_published_at?->toIso8601String(),
                'clientSelectionDeadlineAt' => $project->client_selection_deadline_at?->toIso8601String(),
                'clientSelectionSubmittedAt' => $project->client_selection_submitted_at?->toIso8601String(),
                'clientSelectionResponsesCount' => $submittedStudentsCount,
                'clientSelectionRemainingCount' => max($project->student_count - $submittedStudentsCount, 0),
                'clientSelectionLimitReached' => $submittedStudentsCount >= $project->student_count,
                'montageReviewLink' => filled($project->montage_review_token)
                    ? route('client.montage-reviews.show', ['token' => $project->montage_review_token])
                    : null,
                'montageReviewPublishedAt' => $project->montage_review_published_at?->toIso8601String(),
                'montageReviewSubmittedAt' => $project->montage_review_submitted_at?->toIso8601String(),
                'canApproveModeration' => $this->canApproveModeration($project),
                'canCompletePrinting' => $this->canCompletePrinting($project),
                'isCompleted' => $this->isCompleted($project),
                'printingReadyAt' => $project->printing_ready_at?->toIso8601String(),
                'selectedMontageUserId' => $project->montageUser?->id ?? $montageStage?->responsibleUsers->first()?->id,
                'selectedMontageUserName' => $project->montageUser?->name ?? $montageStage?->responsibleUsers->first()?->name,
                'selectedDesignerUserId' => $project->designerUser?->id,
                'selectedDesignerUserName' => $project->designerUser?->name,
                'selectedPrintUserId' => $selectedPrintUser?->id ?? $printingStage?->responsibleUsers->first()?->id,
                'selectedPrintUserName' => $selectedPrintUser?->name ?? $printingStage?->responsibleUsers->first()?->name,
                'unitPrice' => $project->unit_price !== null ? (string) $project->unit_price : null,
                'totalPrice' => $project->total_price !== null ? (string) $project->total_price : null,
                'printQuantity' => $project->print_quantity,
                'portraitCount' => $project->portrait_count,
                'studentCount' => $project->student_count,
                'downloads' => [
                    'projectArchiveUrl' => route('moderator.projects.project.archive', $project),
                    'sourceImagesArchiveUrl' => route('moderator.projects.source-images.archive', $project),
                    'readyWorksArchiveUrl' => route('moderator.projects.ready-works.archive', $project),
                ],
            ],
            'sourceImages' => $sourceImages
                ->map(fn (ProjectSourceImage $sourceImage): array => [
                    'id' => $sourceImage->id,
                    'name' => $sourceImage->original_name,
                    'url' => PublicStorageUrl::make($sourceImage->path),
                    'previewUrl' => ProjectSourceImagePreviewGenerator::isBrowserPreviewable(
                        $sourceImage->original_name,
                        $sourceImage->mime_type,
                    )
                        ? PublicStorageUrl::make($sourceImage->path)
                        : null,
                    'sizeBytes' => $sourceImage->size_bytes,
                    'mimeType' => $sourceImage->mime_type,
                    'downloadUrl' => route('moderator.projects.source-images.download', [$project, $sourceImage]),
                    'uploadedAt' => $sourceImage->created_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
            'submissions' => $project->clientSelectionSubmissions
                ->map(function (ProjectClientSelectionSubmission $submission) use ($previewGenerator): array {
                    return [
                        'id' => $submission->id,
                        'studentName' => $submission->student_name,
                        'studentQuote' => $submission->student_quote,
                        'submittedAt' => $submission->submitted_at?->toIso8601String(),
                        'selectedImagesCount' => $submission->selectedImages->count(),
                        'selectedImages' => $submission->selectedImages
                            ->map(function (ProjectSourceImage $sourceImage) use ($previewGenerator): array {
                                $previewPath = $previewGenerator->resolvePreviewPath($sourceImage);

                                return [
                                    'id' => $sourceImage->id,
                                    'name' => $sourceImage->original_name,
                                    'url' => PublicStorageUrl::make($sourceImage->path),
                                    'previewUrl' => $previewPath !== null
                                        ? PublicStorageUrl::make($previewPath)
                                        : null,
                                ];
                            })
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all(),
            'montageAssets' => $project->montageAssets
                ->map(function (ProjectMontageAsset $asset) use ($project, $montagePreviewGenerator): array {
                    $previewPath = $montagePreviewGenerator->resolvePreviewPath($asset);

                    return [
                        'id' => $asset->id,
                        'name' => $asset->original_name,
                        'url' => PublicStorageUrl::make($asset->path),
                        'previewUrl' => $previewPath !== null
                            ? PublicStorageUrl::make($previewPath)
                            : null,
                        'mimeType' => $asset->mime_type,
                        'requestedForRevision' => $project->montageRevisionRequests
                            ->contains('project_montage_asset_id', $asset->id),
                    ];
                })
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
            'designerUsers' => $designerUsers
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
            return false;
        }

        return $project->montage_review_submitted_at !== null
            && $project->montageRevisionRequests->isEmpty();
    }

    private function canCompletePrinting(Project $project): bool
    {
        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_PRINTING) {
            return false;
        }

        if ($project->printing_ready_at === null) {
            return false;
        }

        $printingStage = $project->projectStages->first(
            fn (ProjectStage $stage): bool => $stage->stageDefinition?->slug === ProjectStageDefinition::SLUG_PRINTING,
        );

        return $printingStage?->status === ProjectStage::STATUS_IN_PROGRESS;
    }

    private function isCompleted(Project $project): bool
    {
        $printingStage = $project->projectStages->first(
            fn (ProjectStage $stage): bool => $stage->stageDefinition?->slug === ProjectStageDefinition::SLUG_PRINTING,
        );

        return $printingStage?->status === ProjectStage::STATUS_COMPLETED;
    }

    public function destroy(Project $project): RedirectResponse
    {
        $photographerId = $project->photographer_id;

        $project->load(['sourceImages', 'montageAssets', 'designFiles']);

        $paths = collect()
            ->merge($project->sourceImages->pluck('path'))
            ->merge($project->montageAssets->pluck('path'))
            ->merge($project->designFiles->pluck('path'));

        $project->delete();

        $disk = Storage::disk('public');
        foreach ($paths as $path) {
            if ($disk->exists($path)) {
                $disk->delete($path);
            }
        }

        return to_route('moderator.projects.photographers.show', $photographerId)
            ->with('status', 'Проект удалён.');
    }

    public function publishSelection(
        StoreProjectClientSelectionConfigRequest $request,
        Project $project,
    ): RedirectResponse {
        $project->ensureWorkflowState();

        if (! $project->sourceImages()->exists()) {
            throw ValidationException::withMessages([
                'project' => 'Сначала фотограф должен загрузить исходники.',
            ]);
        }

        if ($project->currentProjectStage()?->stageDefinition?->slug === ProjectStageDefinition::SLUG_NEW_PROJECT) {
            throw ValidationException::withMessages([
                'selection_deadline_at' => 'Сначала фотограф должен подтвердить этап с исходниками.',
            ]);
        }

        if ($project->portrait_count < 1) {
            throw ValidationException::withMessages([
                'selection_deadline_at' => 'Для проекта должно быть указано хотя бы 1 портретное фото.',
            ]);
        }

        DB::transaction(function () use ($project, $request): void {
            if (blank($project->client_selection_token)) {
                $project->forceFill([
                    'client_selection_token' => $this->generateClientSelectionToken(),
                ])->save();
            }

            $project->forceFill([
                'client_selection_published_at' => now(),
                'client_selection_deadline_at' => $request->validated('selection_deadline_at'),
            ])->save();

            $currentStageSlug = $project->currentProjectStage()?->stageDefinition?->slug;

            if ($currentStageSlug === ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT) {
                $project->advanceToStage(ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION);
            }
        });

        return to_route('moderator.projects.show', $project)
            ->with('status', 'Клиентская ссылка сохранена. Ученики могут переходить по ней и отправлять свои анкеты.');
    }

    public function approveSelection(
        ApproveProjectClientSelectionRequest $request,
        Project $project,
    ): RedirectResponse {
        $project->ensureWorkflowState();
        $validated = $request->validated();

        if (! $project->clientSelectionSubmissions()->exists()) {
            throw ValidationException::withMessages([
                'project' => 'Пока нет ни одной клиентской анкеты для отправки на монтаж.',
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

        if (
            $montageUser === null
            || ! $montageUser->hasRole(self::MONTAGE_ROLE)
        ) {
            throw ValidationException::withMessages([
                'montage_user_id' => 'Выберите действующего монтажёра.',
            ]);
        }

        DB::transaction(function () use ($project, $montageUser): void {
            $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);

            $project->forceFill([
                'montage_user_id' => $montageUser->id,
                'designer_user_id' => null,
            ])->save();

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
