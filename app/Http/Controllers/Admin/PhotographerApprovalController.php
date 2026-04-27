<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Support\ProjectSourceImagePreviewGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PhotographerApprovalController extends Controller
{
    /**
     * Show photographers waiting for admin approval.
     */
    public function index(Request $request): Response
    {
        $pendingPhotographers = User::query()
            ->whereNull('approved_at')
            ->whereHas('roles', function ($query): void {
                $query->where('name', 'Фотограф');
            })
            ->orderBy('created_at')
            ->get(['id', 'name', 'phone', 'instagram_url', 'created_at'])
            ->map(fn (User $photographer): array => [
                'id' => $photographer->id,
                'name' => $photographer->name,
                'phone' => $photographer->phone,
                'instagramUrl' => $photographer->instagram_url,
                'registeredAt' => $photographer->created_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('admin/photographer-approvals/index', [
            'pendingPhotographers' => $pendingPhotographers,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Approve a photographer account.
     */
    public function approve(User $user): RedirectResponse
    {
        abort_if(! $user->hasRole('Фотограф'), 404);

        if (! $user->isApproved()) {
            $user->approve();
        }

        return to_route('admin.photographer-approvals.index')
            ->with('status', "Фотограф {$user->name} подтвержден.");
    }

    /**
     * Delete a photographer account together with their projects.
     */
    public function destroy(User $user): RedirectResponse
    {
        abort_if(! $user->hasRole('Фотограф'), 404);

        $projectIds = $user->projects()->pluck('id');
        $designFilePaths = [];
        $sourceImagePaths = [];
        $montageAssetPaths = [];

        if ($projectIds->isNotEmpty()) {
            $projects = Project::query()
                ->whereKey($projectIds)
                ->with([
                    'designFiles:id,project_id,path',
                    'sourceImages:id,project_id,path',
                    'montageAssets:id,project_id,path',
                ])
                ->get();

            $designFilePaths = $projects
                ->flatMap(fn (Project $project) => $project->designFiles->pluck('path'))
                ->filter()
                ->values()
                ->all();

            $sourceImagePaths = $projects
                ->flatMap(fn (Project $project) => $project->sourceImages->pluck('path'))
                ->filter()
                ->values()
                ->all();

            $sourceImagePreviewPaths = $projects
                ->flatMap(fn (Project $project) => $project->sourceImages->pluck('id'))
                ->map(fn (int $id): string => ProjectSourceImagePreviewGenerator::previewPathForId($id))
                ->values()
                ->all();

            $montageAssetPaths = $projects
                ->flatMap(fn (Project $project) => $project->montageAssets->pluck('path'))
                ->filter()
                ->values()
                ->all();
        } else {
            $sourceImagePreviewPaths = [];
        }

        $photographerName = $user->name;
        $pathsToDelete = array_values(array_unique(array_filter([
            $user->avatar_path,
            ...$designFilePaths,
            ...$sourceImagePaths,
            ...$sourceImagePreviewPaths,
            ...$montageAssetPaths,
        ])));

        DB::transaction(function () use ($user): void {
            $user->delete();
        });

        if ($pathsToDelete !== []) {
            Storage::disk('public')->delete($pathsToDelete);
        }

        return back()->with('status', "Фотограф {$photographerName} удален.");
    }
}
