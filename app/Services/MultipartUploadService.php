<?php

namespace App\Services;

use Aws\S3\S3Client;
use Illuminate\Support\Facades\Storage;

class MultipartUploadService
{
    private S3Client $client;

    private string $bucket;

    public function __construct()
    {
        $this->bucket = (string) config('filesystems.disks.s3.bucket');
        $this->client = new S3Client([
            'version' => 'latest',
            'region' => config('filesystems.disks.s3.region'),
            'endpoint' => config('filesystems.disks.s3.endpoint'),
            'credentials' => [
                'key' => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
            'use_path_style_endpoint' => (bool) config('filesystems.disks.s3.use_path_style_endpoint', false),
        ]);
    }

    public function createMultipartUpload(string $key, string $contentType): string
    {
        $result = $this->client->createMultipartUpload([
            'Bucket' => $this->bucket,
            'Key' => $key,
            'ContentType' => $contentType,
        ]);

        return (string) $result['UploadId'];
    }

    public function signPart(string $s3UploadId, string $key, int $partNumber): string
    {
        $expiresMinutes = (int) config('uploads.presign_expires_minutes', 60);

        $command = $this->client->getCommand('UploadPart', [
            'Bucket' => $this->bucket,
            'Key' => $key,
            'UploadId' => $s3UploadId,
            'PartNumber' => $partNumber,
        ]);

        $presignedRequest = $this->client->createPresignedRequest($command, "+{$expiresMinutes} minutes");

        return (string) $presignedRequest->getUri();
    }

    /**
     * @return array<int, array{partNumber: int, size: int, etag: string}>
     */
    public function listParts(string $s3UploadId, string $key): array
    {
        $parts = [];
        $partNumberMarker = 0;

        do {
            $result = $this->client->listParts([
                'Bucket' => $this->bucket,
                'Key' => $key,
                'UploadId' => $s3UploadId,
                'PartNumberMarker' => $partNumberMarker,
            ]);

            foreach (($result['Parts'] ?? []) as $part) {
                $parts[] = [
                    'partNumber' => (int) $part['PartNumber'],
                    'size' => (int) $part['Size'],
                    'etag' => (string) $part['ETag'],
                ];
            }

            $partNumberMarker = (int) ($result['NextPartNumberMarker'] ?? 0);
        } while ((bool) ($result['IsTruncated'] ?? false));

        return $parts;
    }

    /**
     * @param  array<int, array{partNumber: int, etag: string}>  $parts
     */
    public function completeMultipartUpload(string $s3UploadId, string $key, array $parts): void
    {
        $s3Parts = array_map(fn (array $part): array => [
            'PartNumber' => (int) $part['partNumber'],
            'ETag' => (string) $part['etag'],
        ], $parts);

        usort($s3Parts, fn (array $a, array $b): int => $a['PartNumber'] <=> $b['PartNumber']);

        $this->client->completeMultipartUpload([
            'Bucket' => $this->bucket,
            'Key' => $key,
            'UploadId' => $s3UploadId,
            'MultipartUpload' => ['Parts' => $s3Parts],
        ]);
    }

    public function abortMultipartUpload(string $s3UploadId, string $key): void
    {
        try {
            $this->client->abortMultipartUpload([
                'Bucket' => $this->bucket,
                'Key' => $key,
                'UploadId' => $s3UploadId,
            ]);
        } catch (\Throwable) {
        }
    }

    public function fileExists(string $key): bool
    {
        return Storage::disk('s3')->exists($key);
    }

    /**
     * Abort multipart uploads older than the given number of hours.
     */
    public function abortStaleMultipartUploads(int $olderThanHours = 48): int
    {
        $aborted = 0;
        $keyMarker = '';
        $uploadIdMarker = '';

        do {
            $params = ['Bucket' => $this->bucket];

            if ($keyMarker !== '') {
                $params['KeyMarker'] = $keyMarker;
                $params['UploadIdMarker'] = $uploadIdMarker;
            }

            $result = $this->client->listMultipartUploads($params);

            foreach (($result['Uploads'] ?? []) as $upload) {
                $initiatedAt = $upload['Initiated'] ?? null;

                if ($initiatedAt instanceof \DateTimeInterface && $initiatedAt < now()->subHours($olderThanHours)->toDateTime()) {
                    $this->abortMultipartUpload((string) $upload['UploadId'], (string) $upload['Key']);
                    $aborted++;
                }
            }

            $keyMarker = (string) ($result['NextKeyMarker'] ?? '');
            $uploadIdMarker = (string) ($result['NextUploadIdMarker'] ?? '');
        } while ((bool) ($result['IsTruncated'] ?? false));

        return $aborted;
    }

    /**
     * Configure CORS on the bucket to allow direct browser uploads.
     */
    public function configureBucketCors(array $allowedOrigins = ['*']): void
    {
        $this->client->putBucketCors([
            'Bucket' => $this->bucket,
            'CORSConfiguration' => [
                'CORSRules' => [
                    [
                        'AllowedOrigins' => $allowedOrigins,
                        'AllowedMethods' => ['GET', 'PUT', 'HEAD'],
                        'AllowedHeaders' => ['*'],
                        'ExposeHeaders' => ['ETag'],
                        'MaxAgeSeconds' => 3600,
                    ],
                ],
            ],
        ]);
    }
}
