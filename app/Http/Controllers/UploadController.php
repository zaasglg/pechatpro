<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\Upload;
use App\Services\MultipartUploadService;
use App\Support\ProjectMontageAssetPreviewGenerator;
use App\Support\ProjectSourceImagePreviewGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function __construct(
        private readonly MultipartUploadService $multipartService,
    ) {
        abort_unless((bool) config('uploads.large_file_enabled'), 404);
    }

    /**
     * Initialize a multipart upload and return credentials for the frontend.
     *
     * POST /uploads/multipart/create
     */
    public function createMultipart(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', 'max:255'],
            'size_bytes' => ['required', 'integer', 'min:1', 'max:'.(int) config('uploads.max_file_size_bytes')],
            'upload_type' => ['required', 'string', 'in:source-image,montage-asset,design-file'],
            'project_id' => ['required', 'integer'],
        ]);

        $project = $this->resolveProjectForUpload($request, $validated['upload_type'], (int) $validated['project_id']);

        $extension = pathinfo($validated['filename'], PATHINFO_EXTENSION);
        $key = $this->buildStorageKey($validated['upload_type'], $project->id, $extension);

        $s3UploadId = $this->multipartService->createMultipartUpload($key, $validated['content_type']);

        $upload = Upload::create([
            'user_id' => $request->user()->id,
            'original_name' => $validated['filename'],
            'size_bytes' => $validated['size_bytes'],
            'mime_type' => $validated['content_type'],
            'storage_disk' => 's3',
            'storage_path' => $key,
            'status' => Upload::STATUS_UPLOADING,
            'upload_key' => $key,
            'external_upload_id' => $s3UploadId,
            'upload_type' => $validated['upload_type'],
            'context_type' => 'project',
            'context_id' => $project->id,
        ]);

        return response()->json([
            'uploadId' => $upload->id,
            's3UploadId' => $s3UploadId,
            'key' => $key,
        ]);
    }

    /**
     * Return a presigned URL for a single part.
     *
     * GET /uploads/multipart/{uploadId}/sign?part_number=N
     */
    public function signPart(Request $request, int $uploadId): JsonResponse
    {
        $request->validate([
            'part_number' => ['required', 'integer', 'min:1', 'max:10000'],
        ]);

        $upload = $this->resolveActiveUpload($request, $uploadId);

        $url = $this->multipartService->signPart(
            $upload->external_upload_id,
            $upload->upload_key,
            (int) $request->integer('part_number'),
        );

        return response()->json(['url' => $url]);
    }

    /**
     * Return parts already uploaded to S3 (for resume support).
     *
     * GET /uploads/multipart/{uploadId}/parts
     */
    public function listParts(Request $request, int $uploadId): JsonResponse
    {
        $upload = $this->resolveActiveUpload($request, $uploadId);

        $parts = $this->multipartService->listParts(
            $upload->external_upload_id,
            $upload->upload_key,
        );

        return response()->json(['parts' => $parts]);
    }

    /**
     * Complete the S3 multipart upload and mark the record as completed.
     *
     * POST /uploads/multipart/{uploadId}/complete
     */
    public function completeMultipart(Request $request, int $uploadId): JsonResponse
    {
        $request->validate([
            'parts' => ['required', 'array', 'min:1'],
            'parts.*.partNumber' => ['required', 'integer', 'min:1'],
            'parts.*.etag' => ['required', 'string'],
        ]);

        $upload = $this->resolveActiveUpload($request, $uploadId);

        $this->multipartService->completeMultipartUpload(
            $upload->external_upload_id,
            $upload->upload_key,
            $request->input('parts'),
        );

        $upload->update([
            'status' => Upload::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'storagePath' => $upload->upload_key,
        ]);
    }

    /**
     * Abort an in-progress multipart upload.
     *
     * DELETE /uploads/multipart/{uploadId}/abort
     */
    public function abortMultipart(Request $request, int $uploadId): JsonResponse
    {
        $upload = Upload::where('id', $uploadId)
            ->where('user_id', $request->user()->id)
            ->whereIn('status', [Upload::STATUS_PENDING, Upload::STATUS_UPLOADING])
            ->firstOrFail();

        $this->multipartService->abortMultipartUpload(
            $upload->external_upload_id,
            $upload->upload_key,
        );

        $upload->update(['status' => Upload::STATUS_ABORTED]);

        return response()->json(['success' => true]);
    }

    /**
     * Create the final model record after a completed upload.
     *
     * POST /uploads/{uploadId}/finalize
     */
    public function finalize(Request $request, int $uploadId): JsonResponse
    {
        $upload = Upload::where('id', $uploadId)
            ->where('user_id', $request->user()->id)
            ->where('status', Upload::STATUS_COMPLETED)
            ->firstOrFail();

        if (! $this->multipartService->fileExists($upload->upload_key)) {
            return response()->json(['error' => 'Файл не найден в хранилище'], 422);
        }

        $project = $this->resolveProjectForUpload($request, $upload->upload_type, (int) $upload->context_id);

        DB::transaction(function () use ($upload, $project, $request): void {
            match ($upload->upload_type) {
                Upload::TYPE_SOURCE_IMAGE => $this->finalizeSourceImage($upload, $project),
                Upload::TYPE_MONTAGE_ASSET => $this->finalizeMontageAsset($upload, $project, $request->user()->id),
                default => null,
            };
        });

        return response()->json(['success' => true]);
    }

    private function finalizeSourceImage(Upload $upload, Project $project): void
    {
        $sourceImage = $project->sourceImages()->create([
            'path' => $upload->upload_key,
            'original_name' => $upload->original_name,
            'size_bytes' => $upload->size_bytes,
            'mime_type' => $upload->mime_type ?? 'application/octet-stream',
        ]);

        app(ProjectSourceImagePreviewGenerator::class)->ensureGeneratedPreviewPath($sourceImage);
    }

    private function finalizeMontageAsset(Upload $upload, Project $project, int $userId): void
    {
        $project->ensureWorkflowState();

        $asset = $project->montageAssets()->create([
            'path' => $upload->upload_key,
            'original_name' => $upload->original_name,
            'size_bytes' => $upload->size_bytes,
            'mime_type' => $upload->mime_type ?? 'application/octet-stream',
            'uploaded_by_user_id' => $userId,
        ]);

        app(ProjectMontageAssetPreviewGenerator::class)->ensureGeneratedPreviewPath($asset);
    }

    private function resolveActiveUpload(Request $request, int $uploadId): Upload
    {
        return Upload::where('id', $uploadId)
            ->where('user_id', $request->user()->id)
            ->where('status', Upload::STATUS_UPLOADING)
            ->firstOrFail();
    }

    private function resolveProjectForUpload(Request $request, string $uploadType, int $projectId): Project
    {
        return match ($uploadType) {
            Upload::TYPE_SOURCE_IMAGE, Upload::TYPE_DESIGN_FILE => $request->user()
                ->projects()
                ->whereKey($projectId)
                ->firstOrFail(),

            Upload::TYPE_MONTAGE_ASSET => Project::query()
                ->whereKey($projectId)
                ->whereHas('projectStages', function ($query) use ($request): void {
                    $query
                        ->where('status', ProjectStage::STATUS_IN_PROGRESS)
                        ->whereHas('stageDefinition', fn ($q) => $q->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
                        ->whereHas('responsibleUsers', fn ($q) => $q->whereKey($request->user()->id));
                })
                ->firstOrFail(),

            default => abort(422, 'Неверный тип загрузки'),
        };
    }

    private function buildStorageKey(string $uploadType, int $projectId, string $extension): string
    {
        $uuid = Str::uuid()->toString();
        $directory = match ($uploadType) {
            'source-image' => "project-source-images/{$projectId}",
            'montage-asset' => "project-montage-assets/{$projectId}",
            'design-file' => "project-design-files/{$projectId}",
            default => "uploads/{$projectId}",
        };

        $safeExtension = preg_replace('/[^a-zA-Z0-9]/', '', $extension);

        return $safeExtension !== '' && $safeExtension !== null
            ? "{$directory}/{$uuid}.{$safeExtension}"
            : "{$directory}/{$uuid}";
    }
}
