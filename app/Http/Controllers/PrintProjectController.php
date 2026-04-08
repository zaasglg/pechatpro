<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PrintProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $projects = Project::query()
            ->with([
                'photographer:id,name',
                'projectStages.stageDefinition',
            ])
            ->withCount('montageAssets')
            ->whereHas('projectStages', function ($query) use ($request): void {
                $query
                    ->where('status', ProjectStage::STATUS_IN_PROGRESS)
                    ->whereHas('stageDefinition', fn ($stageQuery) => $stageQuery->where('slug', ProjectStageDefinition::SLUG_PRINTING))
                    ->whereHas('responsibleUsers', fn ($userQuery) => $userQuery->whereKey($request->user()->id));
            })
            ->latest()
            ->get()
            ->map(function (Project $project): array {
                $project->ensureWorkflowState();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'className' => $project->class_name,
                    'photographerName' => $project->photographer?->name,
                    'readyWorksCount' => $project->montage_assets_count,
                    'printingReadyAt' => $project->printing_ready_at?->toIso8601String(),
                ];
            })
            ->values();

        return Inertia::render('print/projects/index', [
            'projects' => $projects,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function show(Request $request, Project $project): Response
    {
        $project = $this->resolveAssignedPrintProject($request, $project);
        $project->ensureWorkflowState();
        $project->load([
            'photographer:id,name',
            'montageAssets',
            'projectStages.stageDefinition',
        ]);

        return Inertia::render('print/projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'photographerName' => $project->photographer?->name,
                'currentStageName' => $project->currentProjectStage()?->stageDefinition?->name,
                'printingReadyAt' => $project->printing_ready_at?->toIso8601String(),
            ],
            'readyWorks' => $project->montageAssets
                ->map(fn (ProjectMontageAsset $asset): array => [
                    'id' => $asset->id,
                    'name' => $asset->original_name,
                    'url' => Storage::disk('public')->url($asset->path),
                    'sizeBytes' => $asset->size_bytes,
                ])
                ->values()
                ->all(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function complete(Request $request, Project $project): RedirectResponse
    {
        $project = $this->resolveAssignedPrintProject($request, $project);
        $project->ensureWorkflowState();

        if (! $project->montageAssets()->exists()) {
            throw ValidationException::withMessages([
                'project' => 'Для печати нужны готовые работы от монтажёра.',
            ]);
        }

        $project->forceFill([
            'printing_ready_at' => now(),
        ])->save();

        return to_route('print.projects.index')
            ->with('status', 'Печать отмечена как готовая. Проект отправлен модератору.');
    }

    private function resolveAssignedPrintProject(Request $request, Project $project): Project
    {
        return Project::query()
            ->whereKey($project->getKey())
            ->whereHas('projectStages', function ($query) use ($request): void {
                $query
                    ->where('status', ProjectStage::STATUS_IN_PROGRESS)
                    ->whereHas('stageDefinition', fn ($stageQuery) => $stageQuery->where('slug', ProjectStageDefinition::SLUG_PRINTING))
                    ->whereHas('responsibleUsers', fn ($userQuery) => $userQuery->whereKey($request->user()->id));
            })
            ->firstOrFail();
    }
}
