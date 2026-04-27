<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectSourceImagesRequest;
use App\Models\Project;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Support\ProjectSourceImagePreviewGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProjectSourceImageController extends Controller
{
    /**
     * Redirect legacy source image page to the project tabs view.
     */
    public function show(Request $request, Project $project): RedirectResponse
    {
        $project = $this->resolveProject($request, $project);
        $project->ensureWorkflowState();

        return to_route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ]);
    }

    /**
     * Store new source images for the selected project.
     */
    public function store(
        StoreProjectSourceImagesRequest $request,
        Project $project,
        ProjectSourceImagePreviewGenerator $previewGenerator,
    ): RedirectResponse {
        $project = $this->resolveProject($request, $project);
        $project->ensureWorkflowState();
        $storedPaths = collect();

        try {
            collect($request->file('images'))
                ->each(function (UploadedFile $image) use ($project, $previewGenerator, $storedPaths): void {
                    $path = $image->store("project-source-images/{$project->id}", 'public');
                    $storedPaths->push($path);

                    $sourceImage = $project->sourceImages()->create([
                        'path' => $path,
                        'original_name' => $image->getClientOriginalName(),
                        'size_bytes' => (int) $image->getSize(),
                        'mime_type' => $image->getClientMimeType() ?? 'application/octet-stream',
                    ]);

                    $previewPath = $previewGenerator->ensureGeneratedPreviewPath($sourceImage);

                    if ($previewPath !== null && $previewPath !== $sourceImage->path) {
                        $storedPaths->push($previewPath);
                    }
                });
        } catch (\Throwable $throwable) {
            $this->deleteStoredPaths($storedPaths);

            throw $throwable;
        }

        return to_route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ])
            ->with('status', 'Исходники успешно загружены.');
    }

    /**
     * Advance the project from "new project" to "photographer shot".
     */
    public function complete(Request $request, Project $project): RedirectResponse
    {
        $project = $this->resolveProject($request, $project);
        $project->ensureWorkflowState();

        if (! $project->sourceImages()->exists()) {
            throw ValidationException::withMessages([
                'images' => 'Сначала загрузите исходники.',
            ]);
        }

        $newProjectStage = $project->projectStages()
            ->whereHas('stageDefinition', function ($query): void {
                $query->where('slug', ProjectStageDefinition::SLUG_NEW_PROJECT);
            })
            ->with('stageDefinition')
            ->first();

        if ($newProjectStage?->status !== ProjectStage::STATUS_COMPLETED) {
            $project->advanceToStage(ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT);

            return to_route('projects.show', [
                'project' => $project,
                'tab' => 'source-images',
            ])
                ->with('status', 'Проект переведен на этап "Фотограф снял".');
        }

        return to_route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ])
            ->with('status', 'Этап уже обновлен.');
    }

    /**
     * Delete a source image that belongs to the selected project.
     */
    public function destroy(
        Request $request,
        Project $project,
        ProjectSourceImage $sourceImage,
    ): RedirectResponse {
        $project = $this->resolveProject($request, $project);
        $sourceImage = $project->sourceImages()
            ->whereKey($sourceImage->getKey())
            ->firstOrFail();

        $sourceImageName = $sourceImage->original_name;
        $pathsToDelete = array_values(array_unique(array_filter([
            $sourceImage->path,
            ProjectSourceImagePreviewGenerator::previewPathForId($sourceImage->id),
        ])));

        $sourceImage->delete();

        if ($pathsToDelete !== []) {
            Storage::disk('public')->delete($pathsToDelete);
        }

        return to_route('projects.show', [
            'project' => $project,
            'tab' => 'source-images',
        ])
            ->with('status', "Исходник {$sourceImageName} удален.");
    }

    private function resolveProject(Request $request, Project $project): Project
    {
        return $request->user()
            ->projects()
            ->whereKey($project->getKey())
            ->firstOrFail();
    }

    /**
     * Delete newly stored files if persistence fails mid-request.
     *
     * @param  Collection<int, string>  $storedPaths
     */
    private function deleteStoredPaths(Collection $storedPaths): void
    {
        if ($storedPaths->isNotEmpty()) {
            Storage::disk('public')->delete($storedPaths->all());
        }
    }
}
