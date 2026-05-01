<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesAssignedMontageProject;
use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectSourceImage;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class ProjectMontageDownloadController extends Controller
{
    use ResolvesAssignedMontageProject;

    public function moderatorDownload(Project $project, ProjectMontageAsset $asset): StreamedResponse
    {
        $project->ensureWorkflowState();

        return $this->downloadAsset($project, $asset);
    }

    public function moderatorArchive(Project $project): BinaryFileResponse
    {
        $project->ensureWorkflowState();

        return $this->downloadArchive($project);
    }

    public function moderatorSourceImageDownload(Project $project, ProjectSourceImage $sourceImage): StreamedResponse
    {
        $project->ensureWorkflowState();

        return $this->downloadSourceImage($project, $sourceImage);
    }

    public function moderatorSourceImagesArchive(Project $project): BinaryFileResponse
    {
        $project->ensureWorkflowState();

        return $this->downloadSourceImagesArchive($project);
    }

    public function moderatorProjectArchive(Project $project): BinaryFileResponse
    {
        $project->ensureWorkflowState();

        return $this->downloadProjectArchive($project);
    }

    public function montageDownload(Request $request, Project $project, ProjectMontageAsset $asset): StreamedResponse
    {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();

        return $this->downloadAsset($project, $asset);
    }

    public function montageArchive(Request $request, Project $project): BinaryFileResponse
    {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();

        $viewerId = $request->user()?->id;
        $isDesignerViewer = $project->designer_user_id !== null
            && $project->designer_user_id === $viewerId;

        return $this->downloadArchive(
            $project,
            $isDesignerViewer ? $viewerId : null,
        );
    }

    public function montageClientSelectionArchive(Request $request, Project $project): BinaryFileResponse
    {
        $project = $this->resolveAssignedMontageProject($request->user(), $project);
        $project->ensureWorkflowState();

        return $this->downloadClientSelectionArchive($project);
    }

    public function printDownload(Request $request, Project $project, ProjectMontageAsset $asset): StreamedResponse
    {
        $project = $this->resolveAssignedPrintProject($request->user(), $project);
        $project->ensureWorkflowState();

        return $this->downloadAsset($project, $asset);
    }

    public function printArchive(Request $request, Project $project): BinaryFileResponse
    {
        $project = $this->resolveAssignedPrintProject($request->user(), $project);
        $project->ensureWorkflowState();

        return $this->downloadArchive($project, onlyUploaderUserId: $project->designer_user_id);
    }

    private function downloadAsset(Project $project, ProjectMontageAsset $asset): StreamedResponse
    {
        abort_unless($asset->project_id === $project->id, 404);
        abort_unless(Storage::disk('s3')->exists($asset->path), 404);

        return response()->streamDownload(
            fn () => fpassthru(Storage::disk('s3')->readStream($asset->path)),
            $asset->original_name,
            ['Content-Type' => $asset->mime_type ?? 'application/octet-stream'],
        );
    }

    private function downloadArchive(Project $project, ?int $excludeUploaderUserId = null, ?int $onlyUploaderUserId = null): BinaryFileResponse
    {
        $assets = $project->montageAssets()
            ->when(
                $excludeUploaderUserId !== null,
                fn ($query) => $query->where(function ($query) use ($excludeUploaderUserId): void {
                    $query->where('uploaded_by_user_id', '!=', $excludeUploaderUserId)
                        ->orWhereNull('uploaded_by_user_id');
                }),
            )
            ->when(
                $onlyUploaderUserId !== null,
                fn ($query) => $query->where('uploaded_by_user_id', $onlyUploaderUserId),
            )
            ->get();
        abort_if($assets->isEmpty(), 404);

        $zipPath = tempnam(sys_get_temp_dir(), 'project-ready-works-');
        $zip = new ZipArchive;

        if ($zipPath === false || $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Не удалось подготовить архив.');
        }

        $usedNames = [];

        foreach ($assets as $asset) {
            if (! Storage::disk('s3')->exists($asset->path)) {
                continue;
            }

            $zip->addFromString(
                $this->uniqueArchiveFileName($asset->original_name, $usedNames),
                Storage::disk('s3')->get($asset->path),
            );
        }

        $designFiles = $project->designFiles()->get();

        foreach ($designFiles as $designFile) {
            if (! Storage::disk('s3')->exists($designFile->path)) {
                continue;
            }

            $zip->addFromString(
                $this->uniqueArchiveFileName("дизайн-проекта/{$designFile->original_name}", $usedNames),
                Storage::disk('s3')->get($designFile->path),
            );
        }

        $zip->close();

        return response()
            ->download($zipPath, "project-{$project->id}-ready-works.zip", ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }

    private function downloadSourceImage(Project $project, ProjectSourceImage $sourceImage): StreamedResponse
    {
        abort_unless($sourceImage->project_id === $project->id, 404);
        abort_unless(Storage::disk('s3')->exists($sourceImage->path), 404);

        return response()->streamDownload(
            fn () => fpassthru(Storage::disk('s3')->readStream($sourceImage->path)),
            $sourceImage->original_name,
            ['Content-Type' => $sourceImage->mime_type ?? 'application/octet-stream'],
        );
    }

    private function downloadSourceImagesArchive(Project $project): BinaryFileResponse
    {
        $sourceImages = $project->sourceImages()->get();
        abort_if($sourceImages->isEmpty(), 404);

        $zipPath = tempnam(sys_get_temp_dir(), 'project-source-images-');
        $zip = new ZipArchive;

        if ($zipPath === false || $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Не удалось подготовить архив.');
        }

        $usedNames = [];
        $addedFilesCount = 0;

        foreach ($sourceImages as $sourceImage) {
            if (! Storage::disk('s3')->exists($sourceImage->path)) {
                continue;
            }

            $zip->addFromString(
                $this->uniqueArchiveFileName($sourceImage->original_name, $usedNames),
                Storage::disk('s3')->get($sourceImage->path),
            );
            $addedFilesCount++;
        }

        $zip->close();

        abort_if($addedFilesCount === 0, 404);

        return response()
            ->download($zipPath, "project-{$project->id}-source-images.zip", ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }

    private function downloadProjectArchive(Project $project): BinaryFileResponse
    {
        $sourceImages = $project->sourceImages()->get();
        $readyWorks = $project->montageAssets()->get();
        $designFiles = $project->designFiles()->get();

        abort_if($sourceImages->isEmpty() && $readyWorks->isEmpty() && $designFiles->isEmpty(), 404);

        $zipPath = tempnam(sys_get_temp_dir(), 'project-full-archive-');
        $zip = new ZipArchive;

        if ($zipPath === false || $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Не удалось подготовить архив.');
        }

        $usedNames = [];
        $addedFilesCount = 0;

        foreach ($sourceImages as $sourceImage) {
            if (! Storage::disk('s3')->exists($sourceImage->path)) {
                continue;
            }

            $zip->addFromString(
                $this->uniqueArchiveFileName("source-images/{$sourceImage->original_name}", $usedNames),
                Storage::disk('s3')->get($sourceImage->path),
            );
            $addedFilesCount++;
        }

        foreach ($readyWorks as $readyWork) {
            if (! Storage::disk('s3')->exists($readyWork->path)) {
                continue;
            }

            $zip->addFromString(
                $this->uniqueArchiveFileName("ready-works/{$readyWork->original_name}", $usedNames),
                Storage::disk('s3')->get($readyWork->path),
            );
            $addedFilesCount++;
        }

        foreach ($designFiles as $designFile) {
            if (! Storage::disk('s3')->exists($designFile->path)) {
                continue;
            }

            $zip->addFromString(
                $this->uniqueArchiveFileName("design-files/{$designFile->original_name}", $usedNames),
                Storage::disk('s3')->get($designFile->path),
            );
            $addedFilesCount++;
        }

        $zip->close();

        abort_if($addedFilesCount === 0, 404);

        return response()
            ->download($zipPath, "project-{$project->id}-full-archive.zip", ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }

    private function downloadClientSelectionArchive(Project $project): BinaryFileResponse
    {
        $selectedSourceImages = $project->sourceImages()
            ->whereHas('clientSelectionSubmissionImages')
            ->get();

        abort_if($selectedSourceImages->isEmpty(), 404);

        $zipPath = tempnam(sys_get_temp_dir(), 'project-client-selection-');
        $zip = new ZipArchive;

        if ($zipPath === false || $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Не удалось подготовить архив.');
        }

        $usedNames = [];

        foreach ($selectedSourceImages as $sourceImage) {
            if (! Storage::disk('s3')->exists($sourceImage->path)) {
                continue;
            }

            $zip->addFromString(
                $this->uniqueArchiveFileName($sourceImage->original_name, $usedNames),
                Storage::disk('s3')->get($sourceImage->path),
            );
        }

        $zip->close();

        return response()
            ->download($zipPath, "project-{$project->id}-client-selection.zip", ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }

    private function renderProjectDesignSpec(Project $project): string
    {
        $project->loadMissing('photographer:id,name');

        $lines = [
            'Дизайн проекта',
            '==============',
            '',
            sprintf('Название: %s', $project->name ?? '—'),
            sprintf('Класс: %s', $project->class_name ?? '—'),
            sprintf('Тип альбома: %s', $project->album_type ?? '—'),
            sprintf('Размер альбома: %s', $project->album_size ?? '—'),
            sprintf('Тип обложки: %s', $project->cover_type ?? '—'),
            sprintf('Фотограф: %s', $project->photographer?->name ?? '—'),
        ];

        return implode("\n", $lines)."\n";
    }

    /**
     * @param  array<int, string>  $usedNames
     */
    private function uniqueArchiveFileName(string $originalName, array &$usedNames): string
    {
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $candidate = $originalName;
        $counter = 2;

        while (in_array($candidate, $usedNames, true)) {
            $candidate = $extension !== ''
                ? "{$baseName}-{$counter}.{$extension}"
                : "{$baseName}-{$counter}";
            $counter++;
        }

        $usedNames[] = $candidate;

        return $candidate;
    }

    private function resolveAssignedPrintProject(User $user, Project $project): Project
    {
        return Project::query()
            ->whereKey($project->getKey())
            ->whereHas('projectStages', function ($query) use ($user): void {
                $query
                    ->where('status', ProjectStage::STATUS_IN_PROGRESS)
                    ->whereHas('stageDefinition', fn ($stageQuery) => $stageQuery->where('slug', ProjectStageDefinition::SLUG_PRINTING))
                    ->whereHas('responsibleUsers', fn ($userQuery) => $userQuery->whereKey($user->getKey()));
            })
            ->firstOrFail();
    }
}
