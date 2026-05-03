<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Upload extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_UPLOADING = 'uploading';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_ABORTED = 'aborted';

    public const TYPE_SOURCE_IMAGE = 'source-image';

    public const TYPE_MONTAGE_ASSET = 'montage-asset';

    public const TYPE_DESIGN_FILE = 'design-file';

    protected $fillable = [
        'user_id',
        'original_name',
        'size_bytes',
        'mime_type',
        'storage_disk',
        'storage_path',
        'status',
        'upload_key',
        'external_upload_id',
        'upload_type',
        'context_type',
        'context_id',
        'completed_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_UPLOADING], true);
    }

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'context_id' => 'integer',
            'completed_at' => 'datetime',
        ];
    }
}
