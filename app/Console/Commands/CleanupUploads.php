<?php

namespace App\Console\Commands;

use App\Models\Upload;
use App\Services\MultipartUploadService;
use Illuminate\Console\Command;

class CleanupUploads extends Command
{
    protected $signature = 'uploads:cleanup
        {--dry-run : Show what would be deleted without actually deleting}
        {--stale-s3 : Also abort stale S3 multipart uploads not tracked in the database}';

    protected $description = 'Clean up stale, failed, or incomplete uploads';

    public function handle(MultipartUploadService $multipartService): int
    {
        $dryRun = $this->option('dry-run');
        $pendingHours = (int) config('uploads.cleanup_pending_after_hours', 24);
        $failedHours = (int) config('uploads.cleanup_failed_after_hours', 48);

        $pendingQuery = Upload::whereIn('status', [Upload::STATUS_PENDING, Upload::STATUS_UPLOADING])
            ->where('created_at', '<', now()->subHours($pendingHours));

        $failedQuery = Upload::whereIn('status', [Upload::STATUS_FAILED, Upload::STATUS_ABORTED])
            ->where('created_at', '<', now()->subHours($failedHours));

        $pendingCount = $pendingQuery->count();
        $failedCount = $failedQuery->count();

        $this->info("Found {$pendingCount} stale pending/uploading records (older than {$pendingHours}h)");
        $this->info("Found {$failedCount} failed/aborted records (older than {$failedHours}h)");

        if (! $dryRun) {
            $pendingQuery->each(function (Upload $upload) use ($multipartService): void {
                if ($upload->external_upload_id && $upload->upload_key) {
                    $multipartService->abortMultipartUpload($upload->external_upload_id, $upload->upload_key);
                }
                $upload->update(['status' => Upload::STATUS_FAILED]);
            });

            $failedQuery->delete();

            $this->info('Cleanup complete.');
        } else {
            $this->warn('[DRY RUN] No records were modified.');
        }

        if ($this->option('stale-s3')) {
            $staleHours = (int) config('uploads.cleanup_stale_s3_multipart_after_hours', 48);
            $this->info("Aborting S3 multipart uploads older than {$staleHours}h...");

            if (! $dryRun) {
                $aborted = $multipartService->abortStaleMultipartUploads($staleHours);
                $this->info("Aborted {$aborted} stale S3 multipart upload(s).");
            } else {
                $this->warn('[DRY RUN] Skipped S3 abort.');
            }
        }

        return self::SUCCESS;
    }
}
