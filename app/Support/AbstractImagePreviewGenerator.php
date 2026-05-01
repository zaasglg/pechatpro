<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Imagick;
use Symfony\Component\Process\Process;
use Throwable;

abstract class AbstractImagePreviewGenerator
{
    /**
     * Browser-supported image MIME types that can be shown without conversion.
     *
     * @var array<int, string>
     */
    protected const BROWSER_PREVIEWABLE_IMAGE_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml',
        'image/avif',
    ];

    /**
     * Browser-supported image extensions that can be shown without conversion.
     *
     * @var array<int, string>
     */
    protected const BROWSER_PREVIEWABLE_IMAGE_EXTENSIONS = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'bmp',
        'svg',
        'avif',
    ];

    /**
     * Image-like file extensions that should be rasterized through Imagick.
     *
     * @var array<int, string>
     */
    protected const IMAGICK_PREVIEWABLE_EXTENSIONS = [
        'arw',
        'cr2',
        'cr3',
        'dng',
        'heic',
        'heif',
        'nef',
        'nrw',
        'orf',
        'pdf',
        'pef',
        'psb',
        'psd',
        'raf',
        'rw2',
        'sr2',
        'srf',
        'srw',
        'tif',
        'tiff',
        'x3f',
    ];

    /**
     * The prefix (directory) under which generated preview JPEGs are stored.
     */
    abstract protected static function previewDirectory(): string;

    public static function isBrowserPreviewable(
        string $originalName,
        ?string $mimeType,
    ): bool {
        if ($mimeType !== null && in_array($mimeType, self::BROWSER_PREVIEWABLE_IMAGE_MIME_TYPES, true)) {
            return true;
        }

        return in_array(
            self::fileExtension($originalName),
            self::BROWSER_PREVIEWABLE_IMAGE_EXTENSIONS,
            true,
        );
    }

    public static function previewPathForId(int $id): string
    {
        return static::previewDirectory()."/{$id}.jpg";
    }

    protected function resolvePreviewForAttributes(
        int $id,
        string $path,
        string $originalName,
        ?string $mimeType,
    ): ?string {
        if (self::isBrowserPreviewable($originalName, $mimeType)) {
            return $path;
        }

        return $this->ensurePreviewForAttributes($id, $path, $originalName, $mimeType);
    }

    protected function ensurePreviewForAttributes(
        int $id,
        string $path,
        string $originalName,
        ?string $mimeType,
    ): ?string {
        if (! $this->canGeneratePreview($originalName, $mimeType)) {
            return null;
        }

        $previewPath = static::previewPathForId($id);
        $disk = Storage::disk('s3');

        if ($disk->exists($previewPath)) {
            return $previewPath;
        }

        if (! $disk->exists($path)) {
            return null;
        }

        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) ?: 'tmp';
        $tempFile = sys_get_temp_dir().'/'.bin2hex(random_bytes(8)).'.'.$extension;

        try {
            file_put_contents($tempFile, $disk->get($path));

            $previewBinary = $this->generatePreviewBinary($tempFile);

            if ($previewBinary === null) {
                return null;
            }

            $disk->put($previewPath, $previewBinary);

            return $previewPath;
        } catch (Throwable $throwable) {
            $disk->delete($previewPath);

            report($throwable);

            return null;
        } finally {
            if (is_file($tempFile)) {
                @unlink($tempFile);
            }
        }
    }

    protected function canGeneratePreview(string $originalName, ?string $mimeType): bool
    {
        if (self::isBrowserPreviewable($originalName, $mimeType)) {
            return false;
        }

        if ($mimeType !== null && str_starts_with($mimeType, 'image/')) {
            return true;
        }

        return in_array(
            self::fileExtension($originalName),
            self::IMAGICK_PREVIEWABLE_EXTENSIONS,
            true,
        );
    }

    protected function generatePreviewBinary(string $absolutePath): ?string
    {
        if (class_exists(Imagick::class)) {
            try {
                return $this->generatePreviewWithImagick($absolutePath);
            } catch (Throwable $throwable) {
                $fallbackBinary = $this->generatePreviewWithMacOsQuickLook($absolutePath);

                if ($fallbackBinary !== null) {
                    return $fallbackBinary;
                }

                throw $throwable;
            }
        }

        return $this->generatePreviewWithMacOsQuickLook($absolutePath);
    }

    protected function generatePreviewWithImagick(string $absolutePath): ?string
    {
        $image = new Imagick;
        $image->readImage($absolutePath.'[0]');

        if (method_exists($image, 'autoOrient')) {
            $image->autoOrient();
        }

        if ($image->getImageColorspace() === Imagick::COLORSPACE_CMYK) {
            $image->transformImageColorspace(Imagick::COLORSPACE_SRGB);
        }

        $flattened = $image->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
        $image->clear();
        $image->destroy();

        $flattened->thumbnailImage(1600, 1600, true, true);
        $flattened->setImageFormat('jpeg');
        $flattened->setImageCompression(Imagick::COMPRESSION_JPEG);
        $flattened->setImageCompressionQuality(82);
        $flattened->stripImage();

        $binary = $flattened->getImageBlob();

        $flattened->clear();
        $flattened->destroy();

        return $binary !== '' ? $binary : null;
    }

    protected function generatePreviewWithMacOsQuickLook(string $absolutePath): ?string
    {
        if (! $this->canUseMacOsQuickLook()) {
            return null;
        }

        $temporaryDirectory = sys_get_temp_dir().'/'.static::previewDirectory().'-'.bin2hex(random_bytes(8));

        if (! mkdir($temporaryDirectory, 0700, true) && ! is_dir($temporaryDirectory)) {
            return null;
        }

        try {
            $thumbnailProcess = new Process([
                '/usr/bin/qlmanage',
                '-t',
                '-s',
                '1600',
                '-o',
                $temporaryDirectory,
                $absolutePath,
            ]);
            $thumbnailProcess->run();

            if (! $thumbnailProcess->isSuccessful()) {
                return null;
            }

            $thumbnailPath = $this->firstGeneratedQuickLookFile($temporaryDirectory);

            if ($thumbnailPath === null) {
                return null;
            }

            $jpegPreviewPath = $temporaryDirectory.'/preview.jpg';
            $conversionProcess = new Process([
                '/usr/bin/sips',
                '-s',
                'format',
                'jpeg',
                $thumbnailPath,
                '--out',
                $jpegPreviewPath,
            ]);
            $conversionProcess->run();

            if (! $conversionProcess->isSuccessful() || ! is_file($jpegPreviewPath)) {
                return null;
            }

            $binary = file_get_contents($jpegPreviewPath);

            return $binary !== false && $binary !== '' ? $binary : null;
        } finally {
            $this->deleteTemporaryDirectory($temporaryDirectory);
        }
    }

    protected function canUseMacOsQuickLook(): bool
    {
        return PHP_OS_FAMILY === 'Darwin'
            && is_file('/usr/bin/qlmanage')
            && is_file('/usr/bin/sips');
    }

    private function firstGeneratedQuickLookFile(string $temporaryDirectory): ?string
    {
        $generatedFiles = glob($temporaryDirectory.'/*');

        if ($generatedFiles === false) {
            return null;
        }

        foreach ($generatedFiles as $generatedFile) {
            if (is_file($generatedFile)) {
                return $generatedFile;
            }
        }

        return null;
    }

    private function deleteTemporaryDirectory(string $temporaryDirectory): void
    {
        $generatedFiles = glob($temporaryDirectory.'/*');

        if ($generatedFiles !== false) {
            foreach ($generatedFiles as $generatedFile) {
                if (is_file($generatedFile)) {
                    @unlink($generatedFile);
                }
            }
        }

        @rmdir($temporaryDirectory);
    }

    private static function fileExtension(string $name): string
    {
        return strtolower(pathinfo($name, PATHINFO_EXTENSION));
    }
}
