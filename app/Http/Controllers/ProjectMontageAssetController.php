<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesAssignedMontageProject;
use App\Http\Requests\ReplaceProjectMontageAssetRequest;
use App\Http\Requests\StoreProjectMontageAssetsRequest;
use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectStageDefinition;
use App\Support\ProjectMontageAssetPreviewGenerator;
use App\Support\PublicStorageUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectMontageAssetController extends Controller
{
    use ResolvesAssignedMontageProject;

    public function __construct(private ProjectMontageAssetPreviewGenerator $previewGenerator) {}

    public function show(Request $request, Project $project): Response
    {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();
        $project->load([
            'photographer:id,name',
            'projectStages.stageDefinition',
            'montageAssets',
            'montageRevisionRequests.montageAsset',
        ]);

        $viewerId = $request->user()?->id;
        $isDesignerViewer = $project->designer_user_id !== null
            && $project->designer_user_id === $viewerId;

        $visibleMontageAssets = $isDesignerViewer
            ? $project->montageAssets->where('uploaded_by_user_id', $viewerId)->values()
            : $project->montageAssets;

        $selectedImagesCount = $project->sourceImages()
            ->whereHas('clientSelectionSubmissionImages')
            ->count();

        $designerArchiveAvailable = $isDesignerViewer
            && $project->montageAssets
                ->where('uploaded_by_user_id', '!==', $viewerId)
                ->isNotEmpty();

        return Inertia::render('montage/projects/works', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'coverType' => $project->cover_type,
                'photographerName' => $project->photographer?->name,
            ],
            'montageAssets' => $visibleMontageAssets
                ->map(function (ProjectMontageAsset $asset) use ($project): array {
                    $previewPath = $this->previewGenerator->resolvePreviewPath($asset);

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
                        'requestedForRevision' => $project->montageRevisionRequests
                            ->contains('project_montage_asset_id', $asset->id),
                    ];
                })
                ->values(),
            'clientReview' => [
                'submittedAt' => $project->montage_review_submitted_at?->toIso8601String(),
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
            'clientSelection' => [
                'selectedImagesCount' => $selectedImagesCount,
                'archiveUrl' => $isDesignerViewer
                    ? route('montage.projects.works.archive', $project)
                    : route('montage.projects.client-selection.archive', $project),
                'archiveAvailable' => $isDesignerViewer
                    ? $designerArchiveAvailable
                    : $selectedImagesCount > 0,
            ],
            'workflow' => $this->workflowData($request, $project),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(StoreProjectMontageAssetsRequest $request, Project $project): RedirectResponse
    {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();
        $storedPaths = collect();

        try {
            $createdAssets = $project->montageAssets()->createMany(
                collect($request->file('images'))
                    ->map(function (UploadedFile $image) use ($project, $request, $storedPaths): array {
                        $path = $image->store("project-montage-assets/{$project->id}", 'public');
                        $storedPaths->push($path);

                        return [
                            'path' => $path,
                            'uploaded_by_user_id' => $request->user()?->id,
                            'original_name' => $image->getClientOriginalName(),
                            'size_bytes' => (int) $image->getSize(),
                            'mime_type' => $image->getClientMimeType() ?? 'application/octet-stream',
                        ];
                    })
                    ->all(),
            );

            foreach ($createdAssets as $asset) {
                $previewPath = $this->previewGenerator->ensureGeneratedPreviewPath($asset);

                if ($previewPath !== null && $previewPath !== $asset->path) {
                    $storedPaths->push($previewPath);
                }
            }
        } catch (\Throwable $throwable) {
            $this->deleteStoredPaths($storedPaths);

            throw $throwable;
        }

        return to_route('montage.projects.works.show', $project)
            ->with('status', 'Готовые работы успешно загружены.');
    }

    public function replace(
        ReplaceProjectMontageAssetRequest $request,
        Project $project,
        ProjectMontageAsset $asset,
    ): RedirectResponse {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();

        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_MONTAGE) {
            throw ValidationException::withMessages([
                'image' => 'Заменять готовые работы можно только на этапе монтажа.',
            ]);
        }

        abort_unless($asset->project_id === $project->id, 404);

        $image = $request->file('image');
        $newPath = $image->store("project-montage-assets/{$project->id}", 'public');
        $oldPath = $asset->path;
        $oldPreviewPath = ProjectMontageAssetPreviewGenerator::previewPathForId($asset->id);

        $asset->update([
            'path' => $newPath,
            'original_name' => $image->getClientOriginalName(),
            'size_bytes' => (int) $image->getSize(),
            'mime_type' => $image->getClientMimeType() ?? 'application/octet-stream',
        ]);

        Storage::disk('public')->delete($oldPreviewPath);
        $this->previewGenerator->ensureGeneratedPreviewPath($asset->refresh());

        if ($oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return to_route('montage.projects.works.show', $project)
            ->with('status', 'Готовая работа успешно заменена.');
    }

    public function complete(Request $request, Project $project): RedirectResponse
    {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();

        if (! $project->montageAssets()->exists()) {
            throw ValidationException::withMessages([
                'images' => 'Сначала загрузите готовые работы.',
            ]);
        }

        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_MONTAGE) {
            throw ValidationException::withMessages([
                'images' => 'Проект уже отправлен модератору.',
            ]);
        }

        DB::transaction(function () use ($project): void {
            if ($project->montage_review_published_at !== null) {
                $project->montageRevisionRequests()->delete();

                $project->forceFill([
                    'montage_review_submitted_at' => null,
                    'montage_review_comment' => null,
                ])->save();
            }

            $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);
        });

        return to_route('montage.projects.index')
            ->with('status', $project->designer_user_id === $request->user()?->id
                ? 'Дизайн отправлен модератору на проверку.'
                : 'Работы монтажёра отправлены модератору для передачи дизайнеру.');
    }

    /**
     * @return array{currentStageName: string|null, currentStageSlug: string|null, assignedRole: 'montage'|'designer', canMarkReady: bool}
     */
    private function workflowData(Request $request, Project $project): array
    {
        $currentStage = $project->currentProjectStage();

        return [
            'currentStageName' => $currentStage?->stageDefinition?->name,
            'currentStageSlug' => $currentStage?->stageDefinition?->slug,
            'assignedRole' => $project->designer_user_id !== null
                && $project->designer_user_id === $request->user()?->id
                    ? 'designer'
                    : 'montage',
            'canMarkReady' => $project->montageAssets()->exists()
                && $currentStage?->stageDefinition?->slug === ProjectStageDefinition::SLUG_MONTAGE,
        ];
    }

    /**
     * @param  Collection<int, string>  $storedPaths
     */
    private function deleteStoredPaths(Collection $storedPaths): void
    {
        if ($storedPaths->isNotEmpty()) {
            Storage::disk('public')->delete($storedPaths->all());
        }
    }
}
