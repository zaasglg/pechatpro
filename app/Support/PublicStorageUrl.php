<?php

namespace App\Support;

class PublicStorageUrl
{
    public static function make(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        return '/storage/'.ltrim((string) $path, '/');
    }
}
