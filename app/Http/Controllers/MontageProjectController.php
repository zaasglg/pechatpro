<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MontageProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $projects = Project::query()
            ->with([
                'photographer:id,name',
                'projectStages.stageDefinition',
                'projectStages.responsibleUsers:id,name',
            ])
            ->withCount('montageAssets')
            ->whereHas('projectStages', function ($query) use ($request): void {
                $query
                    ->where('status', ProjectStage::STATUS_IN_PROGRESS)
                    ->whereHas('stageDefinition', fn ($stageQuery) => $stageQuery->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
                    ->whereHas('responsibleUsers', fn ($userQuery) => $userQuery->whereKey($request->user()->id));
            })
            ->latest()
            ->get()
            ->map(function (Project $project): array {
                $project->ensureWorkflowState();
                $currentStage = $project->currentProjectStage();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'className' => $project->class_name,
                    'photographerName' => $project->photographer?->name,
                    'montageAssetsCount' => $project->montage_assets_count,
                    'currentStageName' => $currentStage?->stageDefinition?->name,
                    'currentStageSlug' => $currentStage?->stageDefinition?->slug,
                ];
            })
            ->values();

        return Inertia::render('montage/projects/index', [
            'projects' => $projects,
            'status' => $request->session()->get('status'),
        ]);
    }
}
