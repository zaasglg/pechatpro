<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;

trait ResolvesAssignedMontageProject
{
    private function resolveAssignedMontageProject(User $user, Project $project): Project
    {
        return Project::query()
            ->whereKey($project->getKey())
            ->whereHas('projectStages', function ($query) use ($user): void {
                $query
                    ->where('status', ProjectStage::STATUS_IN_PROGRESS)
                    ->whereHas('stageDefinition', fn ($stageQuery) => $stageQuery->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
                    ->whereHas('responsibleUsers', fn ($userQuery) => $userQuery->whereKey($user->getKey()));
            })
            ->firstOrFail();
    }
}
