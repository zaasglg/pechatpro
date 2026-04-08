<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesAssignedMontageProject;
use App\Http\Requests\ReplaceProjectMontageAssetRequest;
use App\Http\Requests\StoreProjectMontageAssetsRequest;
use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectStageDefinition;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectMontageAssetController extends Controller
{
    use ResolvesAssignedMontageProject;

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
            'montageAssets' => $project->montageAssets
                ->map(fn (ProjectMontageAsset $asset): array => [
                    'id' => $asset->id,
                    'name' => $asset->original_name,
                    'url' => Storage::disk('public')->url($asset->path),
                    'sizeBytes' => $asset->size_bytes,
                    'uploadedAt' => $asset->created_at?->toIso8601String(),
                    'requestedForRevision' => $project->montageRevisionRequests
                        ->contains('project_montage_asset_id', $asset->id),
                ])
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
            'workflow' => $this->workflowData($project),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(StoreProjectMontageAssetsRequest $request, Project $project): RedirectResponse
    {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();
        $storedPaths = collect();

        try {
            $project->montageAssets()->createMany(
                collect($request->file('images'))
                    ->map(function (UploadedFile $image) use ($project, $storedPaths): array {
                        $path = $image->store("project-montage-assets/{$project->id}", 'public');
                        $storedPaths->push($path);

                        return [
                            'path' => $path,
                            'original_name' => $image->getClientOriginalName(),
                            'size_bytes' => (int) $image->getSize(),
                            'mime_type' => $image->getClientMimeType() ?? 'application/octet-stream',
                        ];
                    })
                    ->all(),
            );
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

        $asset->update([
            'path' => $newPath,
            'original_name' => $image->getClientOriginalName(),
            'size_bytes' => (int) $image->getSize(),
            'mime_type' => $image->getClientMimeType() ?? 'application/octet-stream',
        ]);

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

        $project->advanceToStage(ProjectStageDefinition::SLUG_MODERATION);

        return to_route('montage.projects.index')
            ->with('status', 'Готовые работы отправлены модератору на проверку.');
    }

    /**
     * @return array{currentStageName: string|null, currentStageSlug: string|null, canMarkReady: bool}
     */
    private function workflowData(Project $project): array
    {
        $currentStage = $project->currentProjectStage();

        return [
            'currentStageName' => $currentStage?->stageDefinition?->name,
            'currentStageSlug' => $currentStage?->stageDefinition?->slug,
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
