<?php

return [
    'large_file_enabled' => env('LARGE_FILE_UPLOAD_ENABLED', false),
    'large_file_threshold_bytes' => 50 * 1024 * 1024,
    'max_file_size_bytes' => 5 * 1024 * 1024 * 1024,
    'chunk_size_bytes' => 10 * 1024 * 1024,
    'presign_expires_minutes' => 60,
    'cleanup_pending_after_hours' => 24,
    'cleanup_failed_after_hours' => 48,
    'cleanup_stale_s3_multipart_after_hours' => 48,
];
