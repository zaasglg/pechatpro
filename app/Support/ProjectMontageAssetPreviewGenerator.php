<?php

namespace App\Support;

use App\Models\ProjectMontageAsset;

class ProjectMontageAssetPreviewGenerator extends AbstractImagePreviewGenerator
{
    private const PREVIEW_DIRECTORY = 'project-montage-asset-previews';

    protected static function previewDirectory(): string
    {
        return self::PREVIEW_DIRECTORY;
    }

    public function resolvePreviewPath(ProjectMontageAsset $asset): ?string
    {
        return $this->resolvePreviewForAttributes(
            $asset->id,
            $asset->path,
            $asset->original_name,
            $asset->mime_type,
        );
    }

    public function ensureGeneratedPreviewPath(ProjectMontageAsset $asset): ?string
    {
        return $this->ensurePreviewForAttributes(
            $asset->id,
            $asset->path,
            $asset->original_name,
            $asset->mime_type,
        );
    }
}
