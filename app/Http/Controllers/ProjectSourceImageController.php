<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectSourceImagesRequest;
use App\Models\Project;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectSourceImageController extends Controller
{
    /**
     * Display the source image upload page for the selected project.
     */
    public function show(Request $request, Project $project): Response
    {
        $project = $this->resolveProject($request, $project);
        $project->ensureWorkflowState();

        return Inertia::render('projects/source-images', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'coverType' => $project->cover_type,
            ],
            'sourceImages' => $project->sourceImages()
                ->latest()
                ->get()
                ->map(fn (ProjectSourceImage $sourceImage): array => [
                    'id' => $sourceImage->id,
                    'name' => $sourceImage->original_name,
                    'url' => Storage::disk('public')->url($sourceImage->path),
                    'sizeBytes' => $sourceImage->size_bytes,
                    'uploadedAt' => $sourceImage->created_at?->toIso8601String(),
                ])
                ->values(),
            'workflow' => $this->workflowData($project),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Store new source images for the selected project.
     */
    public function store(StoreProjectSourceImagesRequest $request, Project $project): RedirectResponse
    {
        $project = $this->resolveProject($request, $project);
        $project->ensureWorkflowState();
        $storedPaths = collect();

        try {
            $project->sourceImages()->createMany(
                collect($request->file('images'))
                    ->map(function (UploadedFile $image) use ($project, $storedPaths): array {
                        $path = $image->store("project-source-images/{$project->id}", 'public');
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

        return to_route('projects.source-images.show', $project)
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

            return to_route('projects.source-images.show', $project)
                ->with('status', 'Проект переведен на этап "Фотограф снял".');
        }

        return to_route('projects.source-images.show', $project)
            ->with('status', 'Этап уже обновлен.');
    }

    private function resolveProject(Request $request, Project $project): Project
    {
        return $request->user()
            ->projects()
            ->whereKey($project->getKey())
            ->firstOrFail();
    }

    /**
     * Build workflow state for the source image page.
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
