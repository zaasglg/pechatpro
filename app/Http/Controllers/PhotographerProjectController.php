<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use App\Support\ProjectMontageAssetPreviewGenerator;
use App\Support\ProjectPricingCalculator;
use App\Support\ProjectSourceImagePreviewGenerator;
use App\Support\PublicStorageUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PhotographerProjectController extends Controller
{
    /**
     * User-friendly stage labels for the photographer timeline.
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

    /**
     * Display the photographer's project list.
     */
    public function index(Request $request): Response
    {
        $projects = $request->user()
            ->projects()
            ->withSum('sourceImages as source_images_total_size', 'size_bytes')
            ->latest()
            ->get()
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'coverType' => $project->cover_type,
                'pageCount' => $project->page_count,
                'portraitCount' => $project->portrait_count,
                'studentCount' => $project->student_count,
                'printQuantity' => $project->print_quantity,
                'sourceImagesTotalSizeBytes' => (int) ($project->source_images_total_size ?? 0),
                'createdAt' => $project->created_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Show the create project page for photographers.
     */
    public function create(ProjectPricingCalculator $pricingCalculator): Response
    {
        return Inertia::render('projects/create', [
            'classOptions' => Project::CLASS_OPTIONS,
            'albumTypes' => Project::ALBUM_TYPES,
            'albumSizes' => Project::ALBUM_SIZES,
            'coverTypesByAlbumType' => Project::COVER_TYPES_BY_ALBUM_TYPE,
            'pageCountOptionsByAlbumType' => Project::PAGE_COUNT_OPTIONS_BY_ALBUM_TYPE,
            'pageCountUnitsByAlbumType' => Project::PAGE_COUNT_UNITS_BY_ALBUM_TYPE,
            'albumPricingRules' => $pricingCalculator->albumRules(),
            'portraitPricingRules' => $pricingCalculator->portraitRules(),
        ]);
    }

    /**
     * Display the selected photographer project.
     */
    public function show(
        Request $request,
        Project $project,
        ProjectSourceImagePreviewGenerator $previewGenerator,
        ProjectMontageAssetPreviewGenerator $montagePreviewGenerator,
    ): Response {
        $project = $request->user()
            ->projects()
            ->whereKey($project->getKey())
            ->firstOrFail();

        $project->ensureWorkflowState();
        $project->load([
            'projectStages.stageDefinition',
            'projectStages.responsibleUsers:id,name',
            'designerUser:id,name',
        ]);

        $designerAssets = $project->designer_user_id !== null
            ? $project->montageAssets()
                ->where('uploaded_by_user_id', $project->designer_user_id)
                ->latest('id')
                ->get()
                ->map(function (ProjectMontageAsset $asset) use ($montagePreviewGenerator): array {
                    $previewPath = $montagePreviewGenerator->resolvePreviewPath($asset);

                    return [
                        'id' => $asset->id,
                        'name' => $asset->original_name,
                        'url' => PublicStorageUrl::make($asset->path),
                        'previewUrl' => $previewPath !== null
                            ? PublicStorageUrl::make($previewPath)
                            : null,
                        'sizeBytes' => $asset->size_bytes,
                        'mimeType' => $asset->mime_type,
                        'uploadedAt' => $asset->created_at?->toIso8601String(),
                    ];
                })
                ->values()
                ->all()
            : [];

        return Inertia::render('projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'coverType' => $project->cover_type,
                'pageCount' => $project->page_count,
                'portraitCount' => $project->portrait_count,
                'studentCount' => $project->student_count,
                'printQuantity' => $project->print_quantity,
                'unitPrice' => $project->unit_price !== null ? (float) $project->unit_price : null,
                'totalPrice' => $project->total_price !== null ? (float) $project->total_price : null,
                'clientSelectionLink' => filled($project->client_selection_token)
                    && $project->client_selection_published_at !== null
                    ? route('client.projects.show', ['token' => $project->client_selection_token])
                    : null,
                'clientSelectionPublishedAt' => $project->client_selection_published_at?->toIso8601String(),
                'clientSelectionDeadlineAt' => $project->client_selection_deadline_at?->toIso8601String(),
                'clientSelectionSubmittedAt' => $project->client_selection_submitted_at?->toIso8601String(),
                'montageReviewLink' => filled($project->montage_review_token)
                    && $project->montage_review_published_at !== null
                    ? route('client.montage-reviews.show', ['token' => $project->montage_review_token])
                    : null,
                'montageReviewPublishedAt' => $project->montage_review_published_at?->toIso8601String(),
                'createdAt' => $project->created_at?->toIso8601String(),
                'updatedAt' => $project->updated_at?->toIso8601String(),
            ],
            'sourceImages' => $project->sourceImages()
                ->latest()
                ->get()
                ->map(function (ProjectSourceImage $sourceImage) use ($previewGenerator): array {
                    $previewPath = $previewGenerator->resolvePreviewPath($sourceImage);

                    return [
                        'id' => $sourceImage->id,
                        'name' => $sourceImage->original_name,
                        'url' => PublicStorageUrl::make($sourceImage->path),
                        'previewUrl' => $previewPath !== null
                            ? PublicStorageUrl::make($previewPath)
                            : null,
                        'sizeBytes' => $sourceImage->size_bytes,
                        'mimeType' => $sourceImage->mime_type,
                        'uploadedAt' => $sourceImage->created_at?->toIso8601String(),
                    ];
                })
                ->values()
                ->all(),
            'workflow' => $this->workflowData($project),
            'initialTab' => match ($request->string('tab')->toString()) {
                'source-images' => 'source-images',
                'designer-works' => 'designer-works',
                default => 'details',
            },
            'designerAssets' => $designerAssets,
            'designerName' => $project->designerUser?->name,
            'status' => $request->session()->get('status'),
            'stages' => $project->projectStages
                ->sortBy(fn (ProjectStage $stage): int => $stage->stageDefinition->sort_order)
                ->values()
                ->map(fn (ProjectStage $stage): array => [
                    'id' => $stage->id,
                    'name' => $stage->stageDefinition->name,
                    'displayName' => self::STAGE_DISPLAY_NAMES[$stage->stageDefinition->slug]
                        ?? $stage->stageDefinition->name,
                    'slug' => $stage->stageDefinition->slug,
                    'status' => $stage->status,
                    'completedAt' => $stage->completed_at?->toIso8601String(),
                    'assignedUsers' => $stage->responsibleUsers
                        ->map(fn (User $user): array => [
                            'id' => $user->id,
                            'name' => $user->name,
                        ])
                        ->values()
                        ->all(),
                ])
                ->all(),
        ]);
    }

    /**
     * Store a newly created photographer project.
     */
    public function store(
        StoreProjectRequest $request,
        ProjectPricingCalculator $pricingCalculator,
    ): RedirectResponse {
        $validated = $request->validated();
        $storedDesignPath = null;
        $unitPrice = $pricingCalculator->calculateUnitPrice($validated);
        $totalPrice = $pricingCalculator->calculateTotalPrice($validated);

        abort_if($unitPrice === null || $totalPrice === null, 422, 'Для этой конфигурации альбома цена не настроена.');

        try {
            $project = DB::transaction(function () use ($request, $unitPrice, $totalPrice, &$storedDesignPath): Project {
                $project = $request->user()->projects()->create([
                    ...$request->safe()->except('design_file'),
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                ]);

                $designFile = $request->file('design_file');

                if ($designFile instanceof UploadedFile) {
                    $storedDesignPath = $designFile->store("project-design-files/{$project->id}", 'public');

                    $project->designFiles()->create([
                        'path' => $storedDesignPath,
                        'original_name' => $designFile->getClientOriginalName(),
                        'size_bytes' => (int) $designFile->getSize(),
                        'mime_type' => $designFile->getClientMimeType() ?? 'application/octet-stream',
                    ]);
                }

                return $project;
            });
        } catch (\Throwable $throwable) {
            if ($storedDesignPath !== null) {
                Storage::disk('public')->delete($storedDesignPath);
            }

            throw $throwable;
        }

        return to_route('projects.index')
            ->with('status', "Проект {$project->name} создан.");
    }

    /**
     * Remove the selected photographer project.
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $project = $request->user()
            ->projects()
            ->whereKey($project->getKey())
            ->firstOrFail();

        $projectName = $project->name;
        $designFilePaths = $project->designFiles()
            ->pluck('path')
            ->filter()
            ->all();
        $sourceImages = $project->sourceImages()->get(['id', 'path']);
        $sourceImagePaths = $sourceImages
            ->pluck('path')
            ->filter()
            ->all();
        $sourceImagePreviewPaths = $sourceImages
            ->pluck('id')
            ->map(fn (int $id): string => ProjectSourceImagePreviewGenerator::previewPathForId($id))
            ->all();
        $montageAssetPaths = $project->montageAssets()
            ->pluck('path')
            ->filter()
            ->all();

        $project->delete();

        $pathsToDelete = array_values(array_unique([
            ...$designFilePaths,
            ...$sourceImagePaths,
            ...$sourceImagePreviewPaths,
            ...$montageAssetPaths,
        ]));

        if ($pathsToDelete !== []) {
            Storage::disk('public')->delete($pathsToDelete);
        }

        return to_route('projects.index')
            ->with('status', "Проект {$projectName} удален.");
    }

    /**
     * Build workflow state for the photographer project page.
     *
     * @return array{currentStageName: string|null, currentStageSlug: string|null, canMarkReady: bool}
     */
    private function workflowData(Project $project): array
    {
        $currentStage = $project->currentProjectStage();
        $currentStageSlug = $currentStage?->stageDefinition?->slug;
        $newProjectStage = $project->projectStages()
            ->whereHas('stageDefinition', function ($query): void {
                $query->where('slug', ProjectStageDefinition::SLUG_NEW_PROJECT);
            })
            ->first();

        return [
            'currentStageName' => $currentStage?->stageDefinition?->name,
            'currentStageSlug' => $currentStageSlug,
            'canMarkReady' => $project->sourceImages()->exists()
                && $newProjectStage?->status !== ProjectStage::STATUS_COMPLETED,
        ];
    }
}
