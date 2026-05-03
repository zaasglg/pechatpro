import { Head, Link, router, setLayoutProps, usePage, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Download,
    File,
    ImagePlus,
    Upload,
    WandSparkles,
    X,
} from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { index as montageProjectIndex } from '@/actions/App/Http/Controllers/MontageProjectController';
import {
    complete as completeMontageWorks,
    replace as replaceMontageWork,
    show as showMontageWorks,
    store as storeMontageWorks,
} from '@/actions/App/Http/Controllers/ProjectMontageAssetController';
import {
    montageArchive as downloadMontageArchive,
    montageDownload as downloadMontageWork,
} from '@/actions/App/Http/Controllers/ProjectMontageDownloadController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useProgressiveList } from '@/hooks/use-progressive-list';
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
    photographerName: string | null;
};

type MontageAssetItem = {
    id: number;
    name: string;
    url: string;
    previewUrl: string | null;
    sizeBytes: number;
    mimeType: string | null;
    uploadedAt: string | null;
    requestedForRevision: boolean;
};

type SelectedImagePreview = {
    id: string;
    name: string;
    sizeBytes: number;
    url: string;
};

type MontageAssetForm = {
    images: File[];
};

type ReplaceMontageAssetForm = {
    image: File | null;
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
    montageAssets: MontageAssetItem[];
    clientSelection: {
        selectedImagesCount: number;
        archiveUrl: string;
        archiveAvailable: boolean;
    };
    workflow: {
        currentStageName: string | null;
        currentStageSlug: string | null;
        assignedRole: 'montage' | 'designer';
        canMarkReady: boolean;
    };
    clientReview: {
        submittedAt: string | null;
        requestedAssets: Array<{
            id: number;
            name: string;
            comment: string | null;
        }>;
    };
    status?: string | null;
};

export default function MontageProjectWorks({
    project,
    montageAssets,
    clientSelection,
    workflow,
    clientReview,
    status,
}: Props) {
    const { largeFileUploadEnabled } = usePage<{ largeFileUploadEnabled: boolean }>().props;

    const isDesignerWorkspace = workflow.assignedRole === 'designer';
    const workspaceTitle = isDesignerWorkspace ? 'Дизайн' : 'Монтаж';
    const completionLabel = isDesignerWorkspace
        ? 'Отправить дизайн модератору'
        : 'Передать модератору';
    const clientSelectionArchiveLabel = isDesignerWorkspace
        ? 'Скачать работы монтажёра'
        : `Скачать выбор клиента (${clientSelection.selectedImagesCount})`;

    setLayoutProps({
        breadcrumbs: [
            { title: workspaceTitle, href: montageProjectIndex() },
            { title: project.name, href: showMontageWorks(project.id) },
        ],
    });

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadTick, setUploadTick] = useState(0);
    const [activeImage, setActiveImage] = useState<MontageAssetItem | null>(null);
    const [selectedPreviews, setSelectedPreviews] = useState<SelectedImagePreview[]>([]);
    const [largeState, setLargeState] = useState<LargeUploadState>(INITIAL_LARGE_STATE);
    const {
        hasMore: hasMoreMontageAssets,
        loadMore: loadMoreMontageAssets,
        remainingCount: remainingMontageAssetsCount,
        visibleItems: visibleMontageAssets,
    } = useProgressiveList(montageAssets, {
        initialCount: 50,
        incrementBy: 50,
    });

    const completeStageForm = useForm<Record<string, never>>({});
    const replaceForm = useForm<ReplaceMontageAssetForm>({ image: null });
    const revisionCommentsByAssetId = useMemo(
        () =>
            new Map(
                clientReview.requestedAssets.map((asset) => [asset.id, asset.comment]),
            ),
        [clientReview.requestedAssets],
    );
    const {
        data,
        setData,
        post,
        processing,
        progress,
        errors,
        reset,
        clearErrors,
    } = useForm<MontageAssetForm>({ images: [] });

    const resetSelection = () => {
        selectedPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
        setSelectedPreviews([]);
        reset();
        clearErrors();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUploadSuccess = useEffectEvent(() => {
        resetSelection();
    });

    useEffect(() => {
        return () => {
            selectedPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [selectedPreviews]);

    useEffect(() => {
        // Hard guard: never send Inertia POST when multipart is enabled
        if (largeFileUploadEnabled) return;
        if (uploadTick === 0 || data.images.length === 0) return;

        post(storeMontageWorks.url(project.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => handleUploadSuccess(),
        });
    }, [largeFileUploadEnabled, data.images.length, post, project.id, uploadTick]);

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
                    uploadType: 'montage-asset',
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
                router.reload({ only: ['montageAssets'] });
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

    // ── Queue handler ─────────────────────────────────────────────────────────
    const queueImages = useCallback(
        (images: File[]) => {
            resetSelection();
            setIsDragging(false);
            if (images.length === 0) return;

            const tooLarge = images.filter(isTooLarge);
            if (tooLarge.length > 0) return;

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

            setData('images', images);
            setSelectedPreviews(
                images.map((image) => ({
                    id: `${image.name}-${image.size}-${image.lastModified}`,
                    name: image.name,
                    sizeBytes: image.size,
                    url: URL.createObjectURL(image),
                })),
            );
            setUploadTick((value) => value + 1);
        },
        [largeFileUploadEnabled, uploadLargeFiles, resetSelection, setData],
    );

    const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
        queueImages(Array.from(event.target.files ?? []));
    };

    const isUploadingAny = processing || largeState.isActive;

    const openFilePicker = () => {
        if (
            isUploadingAny ||
            completeStageForm.processing ||
            workflow.currentStageSlug !== 'montage'
        ) return;
        fileInputRef.current?.click();
    };

    const openReplaceFilePicker = () => {
        if (
            activeImage === null ||
            !activeImage.requestedForRevision ||
            replaceForm.processing ||
            workflow.currentStageSlug !== 'montage'
        ) return;
        replaceFileInputRef.current?.click();
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
    const activeImageComment =
        activeImage === null ? null : (revisionCommentsByAssetId.get(activeImage.id) ?? null);

    const handleReplaceFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (file === null || activeImage === null) return;

        replaceForm.transform(() => ({ image: file }));

        replaceForm.post(replaceMontageWork.url([project.id, activeImage.id]), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                replaceForm.reset();
                replaceForm.clearErrors();
                replaceForm.transform((data) => data);
                if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
            },
            onError: () => {
                replaceForm.transform((data) => data);
            },
        });
    };

    return (
        <>
            <Head title={`${workspaceTitle} | ${project.name}`} />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={montageProjectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад
                    </Link>

                    <div className="flex flex-wrap gap-3">
                        {clientSelection.archiveAvailable && (
                            <Button
                                asChild
                                type="button"
                                variant="outline"
                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                                <a href={clientSelection.archiveUrl}>
                                    <Download className="mr-2 h-4 w-4" />
                                    {clientSelectionArchiveLabel}
                                </a>
                            </Button>
                        )}

                        {montageAssets.length > 0 && !isDesignerWorkspace && (
                            <Button
                                asChild
                                type="button"
                                variant="outline"
                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                                <a href={downloadMontageArchive.url(project.id)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Скачать архив
                                </a>
                            </Button>
                        )}

                        <Button
                            type="button"
                            size="lg"
                            disabled={
                                isUploadingAny ||
                                completeStageForm.processing ||
                                workflow.currentStageSlug !== 'montage'
                            }
                            className="bg-emerald-500 px-5 text-white hover:bg-emerald-600"
                            onClick={openFilePicker}
                        >
                            <ImagePlus className="mr-2 h-4 w-4" />
                            {isDesignerWorkspace ? 'Добавить дизайны' : 'Добавить готовые работы'}
                        </Button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    name="images"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.heic,.heif,.tif,.tiff,.raf,.arw,.cr2,.cr3,.dng,.nef,.nrw,.orf,.pef,.rw2,.sr2,.srf,.srw,.x3f"
                    multiple
                    className="hidden"
                    onChange={handleFileSelection}
                />
                <input
                    ref={replaceFileInputRef}
                    type="file"
                    name="image"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.heic,.heif,.tif,.tiff,.raf,.arw,.cr2,.cr3,.dng,.nef,.nrw,.orf,.pef,.rw2,.sr2,.srf,.srw,.x3f"
                    className="hidden"
                    onChange={handleReplaceFileSelection}
                />

                <section>
                    <div className="flex flex-col gap-4 border-b border-white/6 pb-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant="outline"
                                className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            >
                                {project.className}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="border-white/10 bg-white/5 text-zinc-200"
                            >
                                {project.albumType}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="border-white/10 bg-white/5 text-zinc-200"
                            >
                                {project.albumSize}
                            </Badge>
                        </div>

                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-semibold text-white">{project.name}</h1>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Фотограф: {project.photographerName ?? 'Не указан'}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Этап:{' '}
                                    {isDesignerWorkspace
                                        ? 'Дизайн виньеток'
                                        : (workflow.currentStageName ?? 'Неизвестно')}
                                </p>
                            </div>

                            {workflow.canMarkReady && (
                                <Button
                                    type="button"
                                    disabled={
                                        completeStageForm.processing ||
                                        montageAssets.length === 0
                                    }
                                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                                    onClick={() => {
                                        completeStageForm.post(
                                            completeMontageWorks.url(project.id),
                                            { preserveScroll: true },
                                        );
                                    }}
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {completionLabel}
                                </Button>
                            )}
                        </div>
                    </div>

                    {status && (
                        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {status}
                        </div>
                    )}

                    {imagesErrorMessage && (
                        <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {imagesErrorMessage}
                        </div>
                    )}

                    {replaceForm.errors.image && (
                        <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {replaceForm.errors.image}
                        </div>
                    )}

                    {imageErrors.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {imageErrors.map((message, index) => (
                                <InputError key={`${message}-${index}`} message={message} />
                            ))}
                        </div>
                    )}

                    <div className="mt-6 space-y-4">
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Выбрать готовые работы"
                            className={cn(
                                'flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-6 py-10 text-center transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none',
                                isDragging
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : 'border-white/10 bg-slate-900/35',
                            )}
                            onClick={openFilePicker}
                            onKeyDown={handleDropzoneKeyDown}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                queueImages(Array.from(event.dataTransfer.files));
                            }}
                        >
                            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-300">
                                <Upload className="h-6 w-6" />
                            </div>
                            <p className="mt-4 text-base font-medium text-white">
                                {isDesignerWorkspace
                                    ? 'Перетащите готовые дизайны сюда'
                                    : 'Перетащите готовые работы сюда'}
                            </p>
                            <p className="mt-2 max-w-xs text-sm text-zinc-500">
                                {largeFileUploadEnabled
                                    ? 'JPG, PNG, WEBP, SVG и RAW-форматы до 5 ГБ за файл'
                                    : 'Поддерживаются JPG, PNG, WEBP, SVG и RAW-форматы (RAF, CR2, CR3, DNG, NEF и другие) до 50 МБ за файл.'}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                disabled={
                                    isUploadingAny ||
                                    completeStageForm.processing ||
                                    workflow.currentStageSlug !== 'montage'
                                }
                                onClick={(event) => {
                                    event.stopPropagation();
                                    openFilePicker();
                                }}
                            >
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Выбрать файлы
                            </Button>

                            {isDesignerWorkspace && montageAssets.length > 0 && (
                                <p className="mt-4 text-xs text-zinc-500">
                                    Загружено файлов: {montageAssets.length}
                                </p>
                            )}
                        </div>

                        {montageAssets.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                                {visibleMontageAssets.map((asset) => {
                                    const thumbSrc = asset.previewUrl;

                                    return (
                                        <button
                                            key={asset.id}
                                            type="button"
                                            title={`${asset.name} · ${formatBytes(asset.sizeBytes)}`}
                                            className="group relative aspect-square overflow-hidden rounded-xl border border-white/6 bg-slate-900/45 text-left transition hover:border-emerald-500/40"
                                            style={{
                                                contentVisibility: 'auto',
                                                containIntrinsicSize: '170px',
                                            }}
                                            onClick={() => setActiveImage(asset)}
                                        >
                                            {thumbSrc ? (
                                                <img
                                                    src={thumbSrc}
                                                    alt={asset.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    fetchPriority="low"
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
                                                    <File className="h-6 w-6" />
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase">
                                                        {getFileTypeLabel(asset.name, asset.mimeType)}
                                                    </span>
                                                </div>
                                            )}
                                            {asset.requestedForRevision && (
                                                <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg shadow-emerald-500/20">
                                                    Правка
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {hasMoreMontageAssets && (
                            <LoadMoreImagesButton
                                remainingCount={remainingMontageAssetsCount}
                                onClick={loadMoreMontageAssets}
                            />
                        )}
                    </div>

                    {/* Standard Inertia progress */}
                    {progress && !largeState.isActive && (
                        <div className="mt-4 rounded-2xl border border-white/6 bg-slate-900/45 px-4 py-3 text-sm text-zinc-300">
                            Загрузка: {progress.percentage}%
                        </div>
                    )}

                    {/* Multipart upload progress */}
                    {largeState.isActive && (
                        <div className="mt-4">
                            <LargeUploadProgress state={largeState} onCancel={cancelLargeUpload} />
                        </div>
                    )}

                    {largeState.error && !largeState.isActive && (
                        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {largeState.error}
                        </div>
                    )}

                    {montageAssets.length === 0 && (
                        <div className="mt-6 rounded-[1.5rem] border border-white/6 bg-slate-900/35 px-6 py-10 text-center">
                            <div className="mx-auto w-fit rounded-full bg-emerald-500/10 p-3 text-emerald-300">
                                <WandSparkles className="h-6 w-6" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-white">
                                {isDesignerWorkspace
                                    ? 'Дизайны ещё не загружены'
                                    : 'Готовые работы еще не загружены'}
                            </h2>
                            <p className="mt-2 text-sm text-zinc-500">
                                {isDesignerWorkspace
                                    ? 'Загрузите дизайн виньеток и затем отправьте проект модератору.'
                                    : 'Загрузите результат монтажа и затем передайте проект дизайнеру через модератора.'}
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <Dialog
                open={activeImage !== null}
                onOpenChange={(open) => !open && setActiveImage(null)}
            >
                <DialogContent className="max-w-4xl border-white/10 bg-slate-950 text-white">
                    <DialogTitle>{activeImage?.name ?? 'Превью'}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Просмотр загруженного файла и замечаний клиента по этому результату.
                    </DialogDescription>

                    {activeImage && (
                        <div className="space-y-4">
                            {activeImage.previewUrl ||
                            canRenderImagePreview(activeImage.name, activeImage.mimeType) ? (
                                <img
                                    src={activeImage.previewUrl ?? activeImage.url}
                                    alt={activeImage.name}
                                    decoding="async"
                                    className="mt-2 max-h-[75vh] w-full rounded-2xl object-contain"
                                />
                            ) : (
                                <div className="mt-2 flex min-h-[320px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-slate-900/45 text-zinc-300">
                                    <File className="h-14 w-14 text-zinc-400" />
                                    <p className="text-sm text-zinc-400">
                                        Для этого формата превью недоступно.
                                    </p>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase text-zinc-300">
                                        {getFileTypeLabel(activeImage.name, activeImage.mimeType)}
                                    </span>
                                </div>
                            )}

                            {activeImage.requestedForRevision && (
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                        >
                                            Клиент просит правку
                                        </Badge>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 whitespace-pre-line text-zinc-200">
                                        {activeImageComment?.trim() ||
                                            'Клиент отметил эту работу для правки без отдельного комментария.'}
                                    </p>

                                    {workflow.currentStageSlug === 'montage' && (
                                        <Button
                                            type="button"
                                            disabled={replaceForm.processing}
                                            className="mt-4 bg-emerald-500 text-white hover:bg-emerald-600"
                                            onClick={openReplaceFilePicker}
                                        >
                                            <ImagePlus className="mr-2 h-4 w-4" />
                                            {replaceForm.processing
                                                ? 'Замена...'
                                                : 'Заменить эту работу'}
                                        </Button>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    asChild
                                    type="button"
                                    variant="outline"
                                    className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                >
                                    <a href={downloadMontageWork.url([project.id, activeImage.id])}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Скачать файл
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function LoadMoreImagesButton({
    remainingCount,
    onClick,
}: {
    remainingCount: number;
    onClick: () => void;
}) {
    return (
        <div className="flex justify-center pt-2">
            <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10"
                onClick={onClick}
            >
                Показать ещё {Math.min(50, remainingCount)}
            </Button>
        </div>
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
            {state.error && <p className="text-xs text-rose-400">{state.error}</p>}
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(sizeBytes: number): string {
    if (sizeBytes >= 1024 * 1024 * 1024)
        return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
    if (sizeBytes >= 1024 * 1024)
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${Math.max(1, Math.round(sizeBytes / 1024))} КБ`;
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

function canRenderImagePreview(name: string, mimeType: string | null): boolean {
    if (mimeType && BROWSER_PREVIEWABLE_IMAGE_MIME_TYPES.has(mimeType)) return true;
    return BROWSER_PREVIEWABLE_IMAGE_EXTENSIONS.has(getFileExtension(name));
}

function getFileTypeLabel(name: string, mimeType: string | null): string {
    const extension = getFileExtension(name);
    if (extension !== '') return extension;
    if (mimeType) return mimeType.split('/')[1] ?? 'file';
    return 'file';
}
