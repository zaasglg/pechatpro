import { Head, Link, router, setLayoutProps, usePage, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, File, ImagePlus, Upload, X } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
    index as projectIndex,
    show as showProject,
} from '@/actions/App/Http/Controllers/PhotographerProjectController';
import {
    complete as completeProjectSourceImages,
    show as showProjectSourceImages,
    store as storeProjectSourceImages,
} from '@/actions/App/Http/Controllers/ProjectSourceImageController';
import InputError from '@/components/input-error';
import ProjectSourceImageViewer from '@/components/project-source-image-viewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    LARGE_FILE_THRESHOLD_BYTES,
    isTooLarge,
    startMultipartUpload,
} from '@/lib/multipart-upload';

type ProjectSummary = {
    id: number;
    name: string;
    className: string;
    albumType: string;
    albumSize: string;
    coverType: string;
};

type SourceImageItem = {
    id: number;
    name: string;
    url: string;
    previewUrl: string | null;
    sizeBytes: number;
    mimeType: string | null;
    uploadedAt: string | null;
};

type SelectedImagePreview = {
    id: string;
    name: string;
    sizeBytes: number;
    url: string;
    mimeType: string;
};

type SourceImageForm = {
    images: File[];
};

type LargeUploadState = {
    isActive: boolean;
    currentIndex: number;
    totalFiles: number;
    currentFileName: string;
    percent: number;
    bytesUploaded: number;
    bytesTotal: number;
    error: string | null;
};

const INITIAL_LARGE_STATE: LargeUploadState = {
    isActive: false,
    currentIndex: 0,
    totalFiles: 0,
    currentFileName: '',
    percent: 0,
    bytesUploaded: 0,
    bytesTotal: 0,
    error: null,
};

type Props = {
    project: ProjectSummary;
    sourceImages: SourceImageItem[];
    workflow: {
        currentStageName: string | null;
        currentStageSlug: string | null;
        canMarkReady: boolean;
    };
    status?: string | null;
};

export default function ProjectSourceImages({
    project,
    sourceImages,
    workflow,
    status,
}: Props) {
    const { largeFileUploadEnabled } = usePage<{ largeFileUploadEnabled: boolean }>().props;

    setLayoutProps({
        breadcrumbs: [
            { title: 'Проекты', href: projectIndex() },
            { title: project.name, href: showProject(project.id) },
            { title: 'Исходники', href: showProjectSourceImages(project.id) },
        ],
    });

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [activeImage, setActiveImage] = useState<SourceImageItem | null>(null);
    const [selectedPreviews, setSelectedPreviews] = useState<SelectedImagePreview[]>([]);
    const [largeState, setLargeState] = useState<LargeUploadState>(INITIAL_LARGE_STATE);

    const completeStageForm = useForm<Record<string, never>>({});
    const { setData, post, processing, progress, errors, reset, clearErrors } =
        useForm<SourceImageForm>({ images: [] });

    useEffect(() => {
        return () => {
            selectedPreviews.forEach((p) => URL.revokeObjectURL(p.url));
        };
    }, [selectedPreviews]);

    const resetSelection = useCallback(() => {
        selectedPreviews.forEach((p) => URL.revokeObjectURL(p.url));
        setSelectedPreviews([]);
        reset();
        clearErrors();
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [selectedPreviews, reset, clearErrors]);

    // ── Large-file path ──────────────────────────────────────────────────────
    const uploadLargeFiles = useCallback(
        async (files: File[]) => {
            const abort = new AbortController();
            abortRef.current = abort;

            const totalBytes = files.reduce((s, f) => s + f.size, 0);

            setLargeState({
                ...INITIAL_LARGE_STATE,
                isActive: true,
                totalFiles: files.length,
                currentIndex: 0,
                currentFileName: files[0]?.name ?? '',
                bytesTotal: totalBytes,
            });

            let allOk = true;
            let completedBytes = 0;

            for (let i = 0; i < files.length; i++) {
                if (abort.signal.aborted) break;

                const file = files[i];
                const fileStartBytes = completedBytes;

                setLargeState((prev) => ({
                    ...prev,
                    currentIndex: i,
                    currentFileName: file.name,
                    error: null,
                }));

                await startMultipartUpload({
                    file,
                    uploadType: 'source-image',
                    projectId: project.id,
                    signal: abort.signal,
                    onProgress: (_percent, fileBytesUploaded) => {
                        const totalUploaded = fileStartBytes + fileBytesUploaded;
                        setLargeState((prev) => ({
                            ...prev,
                            bytesUploaded: totalUploaded,
                            percent: Math.round((totalUploaded / totalBytes) * 100),
                        }));
                    },
                    onSuccess: () => {
                        completedBytes += file.size;
                    },
                    onError: (message) => {
                        allOk = false;
                        setLargeState((prev) => ({ ...prev, error: message }));
                    },
                });

                if (!allOk) break;
            }

            if (allOk && !abort.signal.aborted) {
                setLargeState(INITIAL_LARGE_STATE);
                router.reload({ only: ['sourceImages'] });
            } else if (!abort.signal.aborted) {
                setLargeState((prev) => ({ ...prev, isActive: false }));
            }

            abortRef.current = null;
        },
        [project.id],
    );

    const cancelLargeUpload = () => {
        abortRef.current?.abort();
        setLargeState(INITIAL_LARGE_STATE);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Regular (small) path ─────────────────────────────────────────────────
    const queueImages = useCallback(
        (images: File[]) => {
            resetSelection();
            setIsDragging(false);

            if (images.length === 0) return;

            const tooLarge = images.filter(isTooLarge);
            if (tooLarge.length > 0) {
                setSelectedPreviews([]);
                return;
            }

            // Hard guard: always use multipart when enabled
            if (largeFileUploadEnabled) {
                void uploadLargeFiles(images);
                return;
            }

            // Multipart disabled: guard against batches that would exceed nginx/PHP limits
            const totalSize = images.reduce((sum, file) => sum + file.size, 0);
            if (totalSize > LARGE_FILE_THRESHOLD_BYTES) {
                setLargeState({
                    ...INITIAL_LARGE_STATE,
                    error: `Суммарный размер выбранных файлов (${Math.round(totalSize / 1024 / 1024)} МБ) превышает 50 МБ. Выберите меньше файлов за раз.`,
                });
                return;
            }

            setSelectedPreviews(
                images.map((image) => ({
                    id: `${image.name}-${image.size}-${image.lastModified}`,
                    name: image.name,
                    sizeBytes: image.size,
                    url: URL.createObjectURL(image),
                    mimeType: image.type,
                })),
            );

            flushSync(() => {
                setData('images', images);
            });

            post(storeProjectSourceImages.url(project.id), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => resetSelection(),
            });
        },
        [largeFileUploadEnabled, uploadLargeFiles, resetSelection, setData, post, project.id],
    );

    const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
        queueImages(Array.from(event.target.files ?? []));
    };

    const isUploadingAny = processing || largeState.isActive;

    const openFilePicker = () => {
        if (isUploadingAny || completeStageForm.processing) return;
        fileInputRef.current?.click();
    };

    const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openFilePicker();
    };

    const imagesErrorMessage = errors.images ?? completeStageForm.errors.images;
    const imageErrors = Object.entries(errors)
        .filter(([key]) => key.startsWith('images.'))
        .map(([, value]) => value);

    return (
        <>
            <Head title={`Исходники | ${project.name}`} />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={showProject(project.id)}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад
                    </Link>

                    <Button
                        type="button"
                        size="lg"
                        disabled={isUploadingAny || completeStageForm.processing}
                        className="bg-emerald-500 px-5 text-white hover:bg-emerald-600"
                        onClick={openFilePicker}
                    >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Добавить файлы
                    </Button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    name="images"
                    multiple
                    className="hidden"
                    onChange={handleFileSelection}
                />

                <section>
                    <PhotographerProjectTabs projectId={project.id} activeTab="source-images" />

                    <div className="flex flex-col gap-4 border-b border-white/6 pb-5">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-semibold text-white">{project.name}</h1>
                                <p className="mt-2 text-sm text-zinc-500">{sourceImages.length} файлов внутри</p>
                                {workflow.currentStageName && (
                                    <p className="mt-1 text-sm text-zinc-500">Этап: {workflow.currentStageName}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {status}
                        </div>
                    )}

                    <div className="mt-6 space-y-6">
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-white/6 bg-slate-900/45 px-6 py-8 text-center backdrop-blur-sm">
                                <p className="text-sm text-zinc-400">
                                    Когда все исходники загружены, нажми кнопку ниже
                                </p>
                                <Button
                                    type="button"
                                    size="lg"
                                    disabled={
                                        !workflow.canMarkReady ||
                                        isUploadingAny ||
                                        completeStageForm.processing
                                    }
                                    className="mt-4 min-w-56 rounded-full bg-emerald-500 px-8 text-white hover:bg-emerald-600 disabled:bg-white/5 disabled:text-zinc-500"
                                    onClick={() => {
                                        completeStageForm.post(
                                            completeProjectSourceImages.url(project.id),
                                            { preserveScroll: true },
                                        );
                                    }}
                                >
                                    Готово
                                </Button>
                                <p className="mt-3 text-xs text-zinc-500">
                                    {sourceImages.length === 0
                                        ? 'Сначала загрузите файлы'
                                        : workflow.canMarkReady
                                          ? 'Проект перейдет на этап "Фотограф снял"'
                                          : 'Этап уже подтвержден'}
                                </p>
                            </div>

                            <div
                                role="button"
                                tabIndex={isUploadingAny ? -1 : 0}
                                aria-label="Выбрать исходники"
                                className={cn(
                                    'w-full rounded-[1.75rem] border border-dashed px-6 py-12 text-center transition focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none',
                                    isDragging
                                        ? 'border-emerald-400 bg-emerald-500/12'
                                        : 'border-white/10 bg-slate-900/45 hover:border-emerald-500/35 hover:bg-emerald-500/8',
                                    isUploadingAny && 'cursor-wait opacity-80',
                                )}
                                onClick={openFilePicker}
                                onKeyDown={handleDropzoneKeyDown}
                                onDragEnter={(event) => {
                                    if (isUploadingAny) return;
                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragOver={(event) => {
                                    if (isUploadingAny) return;
                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(event) => {
                                    event.preventDefault();
                                    setIsDragging(false);
                                }}
                                onDrop={(event) => {
                                    if (isUploadingAny) return;
                                    event.preventDefault();
                                    queueImages(Array.from(event.dataTransfer.files));
                                }}
                            >
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 text-emerald-300">
                                    {isUploadingAny ? (
                                        <Upload className="h-6 w-6 animate-bounce" />
                                    ) : selectedPreviews.length > 0 ? (
                                        <CheckCircle2 className="h-6 w-6" />
                                    ) : (
                                        <ImagePlus className="h-6 w-6" />
                                    )}
                                </div>

                                <h2 className="mt-4 text-2xl font-semibold text-white">
                                    {isUploadingAny
                                        ? 'Загрузка...'
                                        : 'Нажми сюда или перетащи файлы'}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-zinc-400">
                                    {isUploadingAny
                                        ? 'Файлы уже загружаются'
                                        : largeFileUploadEnabled
                                          ? 'Можно выбрать сразу несколько файлов любого типа до 5 ГБ'
                                          : 'Можно выбрать сразу несколько файлов любого типа'}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                    disabled={isUploadingAny || completeStageForm.processing}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openFilePicker();
                                    }}
                                >
                                    <ImagePlus className="mr-2 h-4 w-4" />
                                    Выбрать файлы
                                </Button>
                            </div>

                            <InputError message={imagesErrorMessage} />

                            {imageErrors.length > 0 && (
                                <div className="space-y-1">
                                    {imageErrors.map((message) => (
                                        <InputError key={message} message={message} />
                                    ))}
                                </div>
                            )}

                            {/* Standard Inertia progress */}
                            {progress && !largeState.isActive && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm text-emerald-300">
                                        <span>Загрузка</span>
                                        <span>{progress.percentage}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all"
                                            style={{ width: `${progress.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Multipart upload progress */}
                            {largeState.isActive && (
                                <LargeUploadProgress
                                    state={largeState}
                                    onCancel={cancelLargeUpload}
                                />
                            )}

                            {largeState.error && !largeState.isActive && (
                                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                                    {largeState.error}
                                </div>
                            )}

                            {selectedPreviews.length > 0 && (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                    {selectedPreviews.map((preview) => (
                                        <div
                                            key={preview.id}
                                            className="flex items-center gap-3 rounded-2xl border border-white/6 bg-slate-900/45 p-3"
                                        >
                                            <PreviewThumb
                                                name={preview.name}
                                                url={preview.url}
                                                mimeType={preview.mimeType}
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-white">
                                                    {preview.name}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    {formatBytes(preview.sizeBytes)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sourceImages.length === 0 ? (
                                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-900/45 px-6 py-12 text-center">
                                    <h2 className="text-lg font-medium text-white">Пока пусто</h2>
                                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                                        Добавьте первые файлы проекта
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                    {sourceImages.map((image) => (
                                        <button
                                            key={image.id}
                                            type="button"
                                            className="group overflow-hidden rounded-[1.5rem] border border-white/6 bg-slate-900/45 text-left transition hover:border-emerald-500/25 hover:bg-slate-900/60"
                                            onClick={() => {
                                                if (image.previewUrl) {
                                                    setActiveImage(image);
                                                    return;
                                                }
                                                window.open(image.url, '_blank', 'noopener,noreferrer');
                                            }}
                                        >
                                            <div className="relative aspect-[4/3] overflow-hidden bg-black/30">
                                                <PreviewThumb
                                                    name={image.name}
                                                    previewUrl={image.previewUrl}
                                                    url={image.url}
                                                    mimeType={image.mimeType}
                                                    className="h-full w-full rounded-none object-cover transition duration-300 group-hover:scale-[1.03]"
                                                />
                                                <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                                            </div>
                                            <div className="space-y-2 px-4 py-4">
                                                <h3 className="line-clamp-2 text-sm font-medium text-white">
                                                    {image.name}
                                                </h3>
                                                <p className="text-xs text-zinc-500">
                                                    {formatBytes(image.sizeBytes)}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <ProjectSourceImageViewer
                image={activeImage}
                open={activeImage !== null}
                onOpenChange={(open) => {
                    if (!open) setActiveImage(null);
                }}
            />
        </>
    );
}

// ── Large upload progress UI ─────────────────────────────────────────────────

function LargeUploadProgress({
    state,
    onCancel,
}: {
    state: LargeUploadState;
    onCancel: () => void;
}) {
    const fileLabel =
        state.totalFiles > 1
            ? `Файл ${state.currentIndex + 1} из ${state.totalFiles}: ${state.currentFileName}`
            : state.currentFileName;

    return (
        <div className="space-y-2 rounded-2xl border border-white/6 bg-slate-900/45 px-4 py-4">
            <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-zinc-300">{fileLabel}</span>
                <div className="flex shrink-0 items-center gap-3">
                    <span className="text-emerald-300">{state.percent}%</span>
                    <button
                        type="button"
                        aria-label="Отменить загрузку"
                        className="text-zinc-500 transition hover:text-white"
                        onClick={onCancel}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${state.percent}%` }}
                />
            </div>
            {state.bytesTotal > 0 && (
                <p className="text-xs text-zinc-500">
                    {formatBytes(state.bytesUploaded)} / {formatBytes(state.bytesTotal)}
                </p>
            )}
            {state.error && (
                <p className="text-xs text-rose-400">{state.error}</p>
            )}
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(sizeBytes: number): string {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    if (sizeBytes < 1024 * 1024 * 1024)
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const BROWSER_PREVIEWABLE_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'image/avif',
]);

const BROWSER_PREVIEWABLE_IMAGE_EXTENSIONS = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'bmp',
    'svg',
    'avif',
]);

function getFileExtension(name: string): string {
    const lastDotIndex = name.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === name.length - 1) return '';
    return name.slice(lastDotIndex + 1).toLowerCase();
}

function getFileTypeLabel(name: string, mimeType?: string | null): string {
    const extension = getFileExtension(name);
    if (extension !== '') return extension.toUpperCase();
    if (!mimeType) return 'FILE';
    return mimeType.split('/')[0]?.toUpperCase() || 'FILE';
}

function canRenderImagePreview(name: string, mimeType: string | null | undefined): boolean {
    if (mimeType && BROWSER_PREVIEWABLE_IMAGE_MIME_TYPES.has(mimeType)) return true;
    return BROWSER_PREVIEWABLE_IMAGE_EXTENSIONS.has(getFileExtension(name));
}

function PreviewThumb({
    name,
    previewUrl,
    url,
    mimeType,
    className,
}: {
    name: string;
    previewUrl?: string | null;
    url: string;
    mimeType?: string | null;
    className?: string;
}) {
    const resolvedPreviewUrl =
        previewUrl ?? (canRenderImagePreview(name, mimeType) ? url : null);

    if (resolvedPreviewUrl) {
        return (
            <img
                src={resolvedPreviewUrl}
                alt={name}
                className={cn('h-14 w-14 rounded-xl object-cover', className)}
            />
        );
    }

    return (
        <div
            className={cn(
                'flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/5 px-2 text-zinc-300',
                className,
            )}
        >
            <File className="h-5 w-5" />
            <span className="max-w-full truncate text-[10px] font-semibold text-zinc-400 uppercase">
                {getFileTypeLabel(name, mimeType)}
            </span>
        </div>
    );
}

function PhotographerProjectTabs({
    projectId,
    activeTab,
}: {
    projectId: number;
    activeTab: 'details' | 'source-images';
}) {
    return (
        <Tabs value={activeTab} className="mb-6">
            <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="min-w-max">
                    <TabsTrigger value="details" asChild>
                        <Link href={showProject(projectId)} prefetch>
                            Основная информация
                        </Link>
                    </TabsTrigger>
                    <TabsTrigger value="source-images" asChild>
                        <Link href={showProjectSourceImages(projectId)} prefetch>
                            Свои исходники
                        </Link>
                    </TabsTrigger>
                </TabsList>
            </div>
        </Tabs>
    );
}
