export const LARGE_FILE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per part
const MAX_CONCURRENT_PARTS = 3;
const RESUME_KEY_PREFIX = 'mpu:';

export type UploadType = 'source-image' | 'montage-asset' | 'design-file';

type UploadedPart = {
    partNumber: number;
    etag: string;
};

type ResumeState = {
    uploadId: number;
    key: string;
    uploadedParts: UploadedPart[];
};

export type MultipartUploadOptions = {
    file: File;
    uploadType: UploadType;
    projectId: number;
    onProgress: (percent: number, bytesUploaded: number, bytesTotal: number) => void;
    onSuccess: () => void;
    onError: (message: string) => void;
    signal?: AbortSignal;
};

function getCsrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

function resumeKey(file: File): string {
    return `${RESUME_KEY_PREFIX}${file.name}-${file.size}-${file.lastModified}`;
}

function saveResume(file: File, state: ResumeState): void {
    try {
        localStorage.setItem(resumeKey(file), JSON.stringify(state));
    } catch {
        // ignore QuotaExceededError
    }
}

function loadResume(file: File): ResumeState | null {
    try {
        const raw = localStorage.getItem(resumeKey(file));
        return raw ? (JSON.parse(raw) as ResumeState) : null;
    } catch {
        return null;
    }
}

function clearResume(file: File): void {
    try {
        localStorage.removeItem(resumeKey(file));
    } catch {
        // ignore
    }
}

async function apiFetch<T>(
    url: string,
    init: RequestInit,
    signal?: AbortSignal,
): Promise<T> {
    const response = await fetch(url, {
        ...init,
        signal,
        headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            Accept: 'application/json',
            ...(init.headers ?? {}),
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
            (body as { message?: string }).message ??
            `HTTP ${response.status}`;
        throw new Error(message);
    }

    return response.json() as T;
}

export async function startMultipartUpload(
    opts: MultipartUploadOptions,
): Promise<void> {
    const { file, uploadType, projectId, onProgress, onSuccess, onError, signal } =
        opts;

    const totalBytes = file.size;
    const numParts = Math.ceil(totalBytes / CHUNK_SIZE);
    const bytesPerPart: Record<number, number> = {};

    let uploadId: number;
    let key: string;
    let completedParts: UploadedPart[] = [];

    function getTotalUploaded(): number {
        return Object.values(bytesPerPart).reduce((a, b) => a + b, 0);
    }

    try {
        // ── Resume or create ────────────────────────────────────────────────
        const resume = loadResume(file);
        if (resume) {
            uploadId = resume.uploadId;
            key = resume.key;

            // Verify with S3 what parts are already there
            try {
                const { parts } = await apiFetch<{
                    parts: Array<{ partNumber: number; etag: string }>;
                }>(
                    `/uploads/multipart/${uploadId}/parts`,
                    { method: 'GET' },
                    signal,
                );
                completedParts = parts;
            } catch {
                completedParts = resume.uploadedParts;
            }
        } else {
            const created = await apiFetch<{
                uploadId: number;
                key: string;
            }>(
                '/uploads/multipart/create',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.name,
                        content_type: file.type || 'application/octet-stream',
                        size_bytes: file.size,
                        upload_type: uploadType,
                        project_id: projectId,
                    }),
                },
                signal,
            );
            uploadId = created.uploadId;
            key = created.key;
        }

        saveResume(file, { uploadId, key, uploadedParts: completedParts });

        // Pre-fill progress for already-uploaded parts
        const doneSet = new Set(completedParts.map((p) => p.partNumber));
        completedParts.forEach((p) => {
            const isLast = p.partNumber === numParts;
            bytesPerPart[p.partNumber] = isLast
                ? totalBytes - (numParts - 1) * CHUNK_SIZE
                : CHUNK_SIZE;
        });

        onProgress(
            Math.round((getTotalUploaded() / totalBytes) * 100),
            getTotalUploaded(),
            totalBytes,
        );

        // ── Upload remaining parts ───────────────────────────────────────────
        const pending = Array.from({ length: numParts }, (_, i) => i + 1).filter(
            (n) => !doneSet.has(n),
        );

        async function uploadPart(partNumber: number): Promise<void> {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, totalBytes);
            const chunk = file.slice(start, end);

            const { url } = await apiFetch<{ url: string }>(
                `/uploads/multipart/${uploadId}/sign?part_number=${partNumber}`,
                { method: 'GET' },
                signal,
            );

            const partResponse = await fetch(url, {
                method: 'PUT',
                body: chunk,
                signal,
            });

            if (!partResponse.ok) {
                throw new Error(
                    `Ошибка загрузки части ${partNumber}: HTTP ${partResponse.status}`,
                );
            }

            const rawEtag = partResponse.headers.get('ETag');
            if (!rawEtag) {
                throw new Error(`Часть ${partNumber}: сервер не вернул ETag`);
            }

            const etag = rawEtag.replace(/"/g, '');
            bytesPerPart[partNumber] = end - start;

            completedParts = [
                ...completedParts,
                { partNumber, etag },
            ].sort((a, b) => a.partNumber - b.partNumber);

            saveResume(file, { uploadId, key, uploadedParts: completedParts });

            onProgress(
                Math.round((getTotalUploaded() / totalBytes) * 100),
                getTotalUploaded(),
                totalBytes,
            );
        }

        // Process with bounded concurrency
        const queue = [...pending];
        while (queue.length > 0) {
            const batch = queue.splice(0, MAX_CONCURRENT_PARTS);
            await Promise.all(batch.map((n) => uploadPart(n)));
        }

        // ── Complete ─────────────────────────────────────────────────────────
        await apiFetch(
            `/uploads/multipart/${uploadId}/complete`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parts: completedParts.map((p) => ({
                        partNumber: p.partNumber,
                        etag: `"${p.etag}"`,
                    })),
                }),
            },
            signal,
        );

        // ── Finalize (create DB model record) ────────────────────────────────
        await apiFetch(
            `/uploads/${uploadId}/finalize`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            },
            signal,
        );

        clearResume(file);
        onProgress(100, totalBytes, totalBytes);
        onSuccess();
    } catch (err) {
        if (
            err instanceof DOMException &&
            err.name === 'AbortError'
        ) {
            return; // user cancelled — do not report error
        }
        const message =
            err instanceof Error ? err.message : 'Неизвестная ошибка загрузки';
        onError(message);
    }
}

export function abortUploadOnServer(uploadId: number): void {
    navigator.sendBeacon(
        `/uploads/multipart/${uploadId}/abort`,
    );
    // sendBeacon doesn't send custom headers, so this is best-effort.
    // The cleanup command will abort stale S3 uploads automatically.
}

export function isLargeFile(file: File): boolean {
    return file.size > LARGE_FILE_THRESHOLD_BYTES;
}

export function isTooLarge(file: File): boolean {
    return file.size > MAX_FILE_SIZE_BYTES;
}
