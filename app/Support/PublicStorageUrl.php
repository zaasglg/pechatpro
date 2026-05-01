<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class PublicStorageUrl
{
    public static function make(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        try {
            return Storage::disk('s3')->temporaryUrl($path, now()->addHours(6));
        } catch (\RuntimeException) {
            return Storage::disk('s3')->url($path);
        }
    }
}
