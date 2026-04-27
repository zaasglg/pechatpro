<?php

namespace App\Support;

use App\Models\ProjectSourceImage;

class ProjectSourceImagePreviewGenerator extends AbstractImagePreviewGenerator
{
    private const PREVIEW_DIRECTORY = 'project-source-image-previews';

    protected static function previewDirectory(): string
    {
        return self::PREVIEW_DIRECTORY;
    }

    public function resolvePreviewPath(ProjectSourceImage $sourceImage): ?string
    {
        return $this->resolvePreviewForAttributes(
            $sourceImage->id,
            $sourceImage->path,
            $sourceImage->original_name,
            $sourceImage->mime_type,
        );
    }

    public function ensureGeneratedPreviewPath(ProjectSourceImage $sourceImage): ?string
    {
        return $this->ensurePreviewForAttributes(
            $sourceImage->id,
            $sourceImage->path,
            $sourceImage->original_name,
            $sourceImage->mime_type,
        );
    }
}
