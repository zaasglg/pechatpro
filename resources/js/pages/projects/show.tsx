import {
    Head,
    Link,
    router,
    setLayoutProps,
    useForm,
    usePage,
} from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Copy,
    Download,
    ExternalLink,
    File,
    ImagePlus,
    Images,
    LayoutDashboard,
    Link2,
    Palette,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import {
    startTransition,
    useDeferredValue,
    useRef,
    useState,
} from 'react';
import { flushSync } from 'react-dom';
import {
    destroy as destroyProject,
    index as projectIndex,
    show as showProject,
} from '@/actions/App/Http/Controllers/PhotographerProjectController';
import {
    complete as completeProjectSourceImages,
    destroy as destroyProjectSourceImage,
    store as storeProjectSourceImages,
} from '@/actions/App/Http/Controllers/ProjectSourceImageController';
import ClientSelectionDeadlinePanel from '@/components/client-selection-deadline-panel';
import InputError from '@/components/input-error';
import ProjectSourceImageViewer from '@/components/project-source-image-viewer';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClipboard } from '@/hooks/use-clipboard';
import { useProgressiveList } from '@/hooks/use-progressive-list';
import {
    LARGE_FILE_THRESHOLD_BYTES,
    isTooLarge,
    startMultipartUpload,
} from '@/lib/multipart-upload';
import { cn } from '@/lib/utils';

type ProjectDetails = {
    id: number;
    name: string;
    className: string;
    albumType: string;
    albumSize: string;
    coverType: string;
    pageCount: number;
    portraitCount: number;
    studentCount: number;
    printQuantity: number;
    clientSelectionLink: string | null;
    clientSelectionPublishedAt: string | null;
    clientSelectionDeadlineAt: string | null;
    clientSelectionSubmittedAt: string | null;
    montageReviewLink: string | null;
    montageReviewPublishedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

type ProjectStage = {
    id: number;
    name: string;
    displayName: string;
    slug: string;
    status: string;
    completedAt: string | null;
    assignedUsers: Array<{
        id: number;
        name: string;
    }>;
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
    project: ProjectDetails;
    stages: ProjectStage[];
    sourceImages: SourceImageItem[];
    designerAssets: SourceImageItem[];
    designerName: string | null;
    workflow: {
        currentStageName: string | null;
        currentStageSlug: string | null;
        canMarkReady: boolean;
    };
    initialTab: 'details' | 'source-images' | 'designer-works';
    status?: string | null;
};

export default function ProjectShow({
    project,
    stages,
    sourceImages,
    designerAssets,
    designerName,
    workflow,
    initialTab,
    status,
}: Props) {
    const { largeFileUploadEnabled } = usePage<{
        largeFileUploadEnabled: boolean;
    }>().props;
    const [copiedText, copy] = useClipboard();
    const deleteForm = useForm<Record<string, never>>({});
    const deleteSourceImageForm = useForm<Record<string, never>>({});
    const [activeTab, setActiveTab] = useState<
        'details' | 'source-images' | 'designer-works'
    >(initialTab);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [activeImage, setActiveImage] = useState<SourceImageItem | null>(
        null,
    );
    const [imagePendingDeletion, setImagePendingDeletion] =
        useState<SourceImageItem | null>(null);
    const [selectedPreviews, setSelectedPreviews] = useState<
        SelectedImagePreview[]
    >([]);
    const [largeState, setLargeState] =
        useState<LargeUploadState>(INITIAL_LARGE_STATE);
    const deferredSelectedPreviews = useDeferredValue(selectedPreviews);
    const completeStageForm = useForm<Record<string, never>>({});
    const { setData, post, processing, progress, errors, reset, clearErrors } =
        useForm<SourceImageForm>({
            images: [],
        });

    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Проекты',
                href: projectIndex(),
            },
            {
                title: project.name,
                href: showProject(project.id),
            },
        ],
    });

    const resetSelection = () => {
        setSelectedPreviews([]);
        reset();
        clearErrors();

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadLargeFiles = async (files: File[]) => {
        const abort = new AbortController();
        abortRef.current = abort;

        const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

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

        for (let index = 0; index < files.length; index += 1) {
            if (abort.signal.aborted) {
                break;
            }

            const file = files[index];
            const fileStartBytes = completedBytes;

            setLargeState((previous) => ({
                ...previous,
                currentIndex: index,
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

                    setLargeState((previous) => ({
                        ...previous,
                        bytesUploaded: totalUploaded,
                        percent: Math.round((totalUploaded / totalBytes) * 100),
                    }));
                },
                onSuccess: () => {
                    completedBytes += file.size;
                },
                onError: (message) => {
                    allOk = false;
                    setLargeState((previous) => ({
                        ...previous,
                        error: message,
                    }));
                },
            });

            if (!allOk) {
                break;
            }
        }

        if (allOk && !abort.signal.aborted) {
            setLargeState(INITIAL_LARGE_STATE);
            setActiveTab('source-images');
            router.reload({ only: ['sourceImages'] });
        } else if (!abort.signal.aborted) {
            setLargeState((previous) => ({ ...previous, isActive: false }));
        }

        abortRef.current = null;
    };

    const cancelLargeUpload = () => {
        abortRef.current?.abort();
        setLargeState(INITIAL_LARGE_STATE);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const queueImages = (images: File[]) => {
        resetSelection();
        setIsDragging(false);

        if (images.length === 0) {
            return;
        }

        const tooLarge = images.filter(isTooLarge);

        if (tooLarge.length > 0) {
            setLargeState({
                ...INITIAL_LARGE_STATE,
                error: 'Один или несколько файлов превышают 5 ГБ. Выберите файлы меньшего размера.',
            });
            return;
        }

        if (largeFileUploadEnabled) {
            void uploadLargeFiles(images);
            return;
        }

        const totalSize = images.reduce((sum, file) => sum + file.size, 0);

        if (totalSize > LARGE_FILE_THRESHOLD_BYTES) {
            setLargeState({
                ...INITIAL_LARGE_STATE,
                error: 'Суммарный размер выбранных файлов превышает 50 МБ. Выберите меньше файлов за раз.',
            });
            return;
        }

        startTransition(() => {
            setSelectedPreviews(
                images.map((image) => ({
                    id: `${image.name}-${image.size}-${image.lastModified}`,
                    name: image.name,
                    sizeBytes: image.size,
                    mimeType: image.type,
                })),
            );
        });

        flushSync(() => {
            setData('images', images);
        });

        post(storeProjectSourceImages.url(project.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                resetSelection();
                setActiveTab('source-images');
            },
        });
    };

    const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
        queueImages(Array.from(event.target.files ?? []));
    };

    const openFilePicker = () => {
        if (isUploadingAny || completeStageForm.processing) {
            return;
        }

        fileInputRef.current?.click();
    };

    const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        openFilePicker();
    };

    const imagesErrorMessage = errors.images ?? completeStageForm.errors.images;
    const imageErrors = Object.entries(errors)
        .filter(([key]) => key.startsWith('images.'))
        .map(([, value]) => value);
    const isUploadingAny = processing || largeState.isActive;
    const {
        hasMore: hasMoreSourceImages,
        sentinelRef: sourceImagesSentinelRef,
        visibleItems: visibleSourceImages,
    } = useProgressiveList(sourceImages, {
        initialCount: 30,
        incrementBy: 30,
    });
    const {
        hasMore: hasMoreDesignerAssets,
        sentinelRef: designerAssetsSentinelRef,
        visibleItems: visibleDesignerAssets,
    } = useProgressiveList(designerAssets, {
        initialCount: 30,
        incrementBy: 30,
    });

    const handleDeleteSourceImage = () => {
        if (imagePendingDeletion === null) {
            return;
        }

        deleteSourceImageForm.delete(
            destroyProjectSourceImage.url({
                project: project.id,
                sourceImage: imagePendingDeletion.id,
            }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (activeImage?.id === imagePendingDeletion.id) {
                        setActiveImage(null);
                    }

                    setImagePendingDeletion(null);
                },
            },
        );
    };

    return (
        <>
            <Head title={`Проект: ${project.name}`} />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    name="images"
                    multiple
                    className="hidden"
                    onChange={handleFileSelection}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href={projectIndex()}
                        prefetch
                        className="inline-flex w-full items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white sm:w-auto"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад к списку проектов
                    </Link>

                    <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full rounded-full border-rose-500/20 bg-rose-500/10 px-5 text-rose-200 hover:bg-rose-500/15 sm:w-auto"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить проект
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="border border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur-sm sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-semibold text-white">
                                        Удалить проект
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Проект{' '}
                                        <span className="font-medium text-white">
                                            {project.name}
                                        </span>{' '}
                                        будет удален вместе с исходниками,
                                        этапами и готовыми работами. Это
                                        действие нельзя отменить.
                                    </DialogDescription>
                                </DialogHeader>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                        >
                                            Отмена
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="button"
                                        disabled={deleteForm.processing}
                                        className="bg-rose-500 text-white hover:bg-rose-600"
                                        onClick={() => {
                                            deleteForm.delete(
                                                destroyProject.url(project.id),
                                                {
                                                    preserveScroll: true,
                                                },
                                            );
                                        }}
                                    >
                                        Удалить навсегда
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <section>
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(
                                value as
                                    | 'details'
                                    | 'source-images'
                                    | 'designer-works',
                            )
                        }
                    >
                        <PhotographerProjectTabs
                            showDesignerWorks={designerAssets.length > 0}
                        />

                        <TabsContent value="details" className="mt-0">
                            <h1 className="mt-5 text-3xl font-semibold text-white md:text-4xl">
                                {project.name}
                            </h1>

                            {project.clientSelectionPublishedAt && (
                                <ClientSelectionDeadlinePanel
                                    deadlineAt={
                                        project.clientSelectionDeadlineAt
                                    }
                                    submittedAt={
                                        project.clientSelectionSubmittedAt
                                    }
                                    className="mt-6"
                                />
                            )}

                            {(project.clientSelectionLink ||
                                project.montageReviewLink) && (
                                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                                    {project.clientSelectionLink && (
                                        <ProjectPublicLinkCard
                                            title="Публичная ссылка"
                                            description="Ссылка для выбора фотографий клиентом."
                                            href={project.clientSelectionLink}
                                            copiedText={copiedText}
                                            onCopy={copy}
                                        />
                                    )}
                                    {project.montageReviewLink && (
                                        <ProjectPublicLinkCard
                                            title="Ссылка на готовые работы"
                                            description="Ссылка для просмотра и подтверждения готовых работ."
                                            href={project.montageReviewLink}
                                            copiedText={copiedText}
                                            onCopy={copy}
                                        />
                                    )}
                                </div>
                            )}

                            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <SpecRow
                                    label="Класс"
                                    value={project.className}
                                />
                                <SpecRow
                                    label="Тип альбома"
                                    value={project.albumType}
                                />
                                <SpecRow
                                    label="Размер"
                                    value={project.albumSize}
                                />
                                <SpecRow
                                    label="Обложка"
                                    value={project.coverType}
                                />
                                <SpecRow
                                    label="Страницы"
                                    value={`${project.pageCount}`}
                                />
                                <SpecRow
                                    label="Портретки"
                                    value={`${project.portraitCount}`}
                                />
                                <SpecRow
                                    label="Ученики"
                                    value={`${project.studentCount}`}
                                />
                                <SpecRow
                                    label="Печать"
                                    value={`${project.printQuantity} шт.`}
                                />
                            </div>

                            <div className="mt-8 border-t border-white/6 pt-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-sm font-medium text-zinc-300">
                                        Этапы реализации
                                    </h2>
                                    <span className="text-xs text-zinc-500">
                                        {stages.length} этапов
                                    </span>
                                </div>

                                <div className="mt-5 rounded-[1.75rem] border border-white/6 bg-slate-900/45 px-5 py-5 backdrop-blur-sm md:px-6">
                                    <div className="relative">
                                        <div className="absolute top-3 bottom-3 left-[0.45rem] w-px bg-white/8" />

                                        <div className="space-y-6">
                                            {stages.map((stage) => (
                                                <div
                                                    key={stage.id}
                                                    className="relative flex items-start justify-between gap-4"
                                                >
                                                    <div className="flex min-w-0 items-start gap-4">
                                                        <span
                                                            className={`relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-4 border-[#0b0b0b] ${stageStatusDotClassName(stage.status)}`}
                                                        />

                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-white md:text-base">
                                                                {
                                                                    stage.displayName
                                                                }
                                                            </p>
                                                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                                                                {stage
                                                                    .assignedUsers
                                                                    .length > 0
                                                                    ? `Ответственный: ${stage.assignedUsers.map((user) => user.name).join(', ')}`
                                                                    : stage.status ===
                                                                        'completed'
                                                                      ? 'Этап завершён и готов к передаче дальше'
                                                                      : stage.status ===
                                                                          'in_progress'
                                                                        ? 'Команда приступит к этапу в ближайшее время'
                                                                        : 'Этап запланирован, исполнитель появится позже'}
                                                            </p>
                                                            {stage.completedAt && (
                                                                <p className="mt-2 text-xs font-black text-zinc-500 uppercase">
                                                                    Завершён{' '}
                                                                    {formatStageCompletedAt(
                                                                        stage.completedAt,
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 pt-0.5">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${stageStatusBadgeClassName(stage.status)}`}
                                                        >
                                                            {formatStageStatus(
                                                                stage.status,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="source-images" className="mt-0">
                            <div className="flex flex-col gap-4 border-b border-white/6 pb-5 xl:flex-row xl:items-center xl:justify-between">
                                <div>
                                    <h1 className="mt-5 text-3xl font-semibold text-white md:text-4xl">
                                        {project.name}
                                    </h1>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        {sourceImages.length} файлов внутри
                                    </p>
                                </div>

                                <div className="flex w-full flex-col items-stretch gap-2 xl:w-auto xl:items-end">
                                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
                                        <Button
                                            type="button"
                                            size="lg"
                                            disabled={
                                                isUploadingAny ||
                                                completeStageForm.processing
                                            }
                                            className="w-full bg-emerald-500 px-5 text-white hover:bg-emerald-600 sm:w-auto"
                                            onClick={openFilePicker}
                                        >
                                            <ImagePlus className="mr-2 h-4 w-4" />
                                            Добавить файлы
                                        </Button>
                                        <Button
                                            type="button"
                                            size="lg"
                                            disabled={
                                                !workflow.canMarkReady ||
                                                isUploadingAny ||
                                                completeStageForm.processing
                                            }
                                            variant="outline"
                                            className="w-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10 disabled:bg-white/5 disabled:text-zinc-500 sm:w-auto"
                                            onClick={() => {
                                                completeStageForm.post(
                                                    completeProjectSourceImages.url(
                                                        project.id,
                                                    ),
                                                    {
                                                        preserveScroll: true,
                                                    },
                                                );
                                            }}
                                        >
                                            Загрузил все исходники
                                        </Button>
                                    </div>

                                    <p className="text-xs leading-relaxed text-zinc-500 xl:text-right">
                                        {sourceImages.length === 0
                                            ? 'Сначала загрузите фото'
                                            : workflow.canMarkReady
                                              ? 'После подтверждения проект перейдет на следующий этап'
                                              : 'Этап уже подтвержден'}
                                    </p>
                                </div>
                            </div>

                            {status && (
                                <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                    {status}
                                </div>
                            )}

                            <div className="mt-6 space-y-6">
                                <div
                                    role="button"
                                    tabIndex={isUploadingAny ? -1 : 0}
                                    aria-label="Выбрать исходники"
                                    className={cn(
                                        'w-full rounded-[1.75rem] border border-dashed px-6 py-12 text-center transition focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none',
                                        isDragging
                                            ? 'border-emerald-400 bg-emerald-500/12'
                                            : 'border-white/10 bg-slate-900/45 hover:border-emerald-500/35 hover:bg-emerald-500/8',
                                        isUploadingAny &&
                                            'cursor-wait opacity-80',
                                    )}
                                    onClick={openFilePicker}
                                    onKeyDown={handleDropzoneKeyDown}
                                    onDragEnter={(event) => {
                                        if (isUploadingAny) {
                                            return;
                                        }

                                        event.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragOver={(event) => {
                                        if (isUploadingAny) {
                                            return;
                                        }

                                        event.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={(event) => {
                                        event.preventDefault();
                                        setIsDragging(false);
                                    }}
                                    onDrop={(event) => {
                                        if (isUploadingAny) {
                                            return;
                                        }

                                        event.preventDefault();
                                        queueImages(
                                            Array.from(
                                                event.dataTransfer.files ?? [],
                                            ),
                                        );
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
                                        disabled={
                                            isUploadingAny ||
                                            completeStageForm.processing
                                        }
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
                                            <InputError
                                                key={message}
                                                message={message}
                                            />
                                        ))}
                                    </div>
                                )}

                                {progress && !largeState.isActive && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-emerald-300">
                                            <span>Загрузка</span>
                                            <span>{progress.percentage}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all"
                                                style={{
                                                    width: `${progress.percentage}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

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

                                {deferredSelectedPreviews.length > 0 && (
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                        {deferredSelectedPreviews.map(
                                            (preview) => (
                                                <div
                                                    key={preview.id}
                                                    className="flex items-center gap-3 rounded-2xl border border-white/6 bg-slate-900/45 p-3"
                                                >
                                                    <PendingUploadThumb
                                                        name={preview.name}
                                                        mimeType={
                                                            preview.mimeType
                                                        }
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-white">
                                                            {preview.name}
                                                        </p>
                                                        <p className="text-xs text-zinc-500">
                                                            {formatBytes(
                                                                preview.sizeBytes,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}

                                {sourceImages.length === 0 ? (
                                    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-900/45 px-6 py-12 text-center">
                                        <h2 className="text-lg font-medium text-white">
                                            Пока пусто
                                        </h2>
                                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                                            Добавьте первые файлы проекта
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                        {visibleSourceImages.map((image) => (
                                            <div
                                                key={image.id}
                                                className="group relative overflow-hidden rounded-[1.5rem] border border-white/6 bg-slate-900/45 transition hover:border-emerald-500/25 hover:bg-slate-900/60"
                                                style={{
                                                    contentVisibility: 'auto',
                                                    containIntrinsicSize:
                                                        '320px',
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="block w-full text-left"
                                                    onClick={() => {
                                                        if (image.previewUrl) {
                                                            setActiveImage(
                                                                image,
                                                            );

                                                            return;
                                                        }

                                                        window.open(
                                                            image.url,
                                                            '_blank',
                                                            'noopener,noreferrer',
                                                        );
                                                    }}
                                                >
                                                    <div className="relative aspect-[4/3] overflow-hidden bg-black/30">
                                                        <PreviewThumb
                                                            name={image.name}
                                                            previewUrl={
                                                                image.previewUrl
                                                            }
                                                            url={image.url}
                                                            mimeType={
                                                                image.mimeType
                                                            }
                                                            className="h-full w-full rounded-none object-cover transition duration-300 group-hover:scale-[1.03]"
                                                        />
                                                        <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                                                    </div>
                                                    <div className="space-y-2 px-4 py-4">
                                                        <h3 className="line-clamp-2 text-sm font-medium text-white">
                                                            {image.name}
                                                        </h3>
                                                        <p className="text-xs text-zinc-500">
                                                            {formatBytes(
                                                                image.sizeBytes,
                                                            )}
                                                        </p>
                                                    </div>
                                                </button>

                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    disabled={
                                                        deleteSourceImageForm.processing
                                                    }
                                                    className="absolute top-3 right-3 z-10 h-9 w-9 border-white/10 bg-black/45 text-white backdrop-blur-sm hover:bg-rose-500/20 hover:text-rose-100"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setImagePendingDeletion(
                                                            image,
                                                        );
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        Удалить исходник{' '}
                                                        {image.name}
                                                    </span>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {hasMoreSourceImages && (
                                    <div
                                        ref={sourceImagesSentinelRef}
                                        className="h-10"
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                        </TabsContent>

                        {designerAssets.length > 0 && (
                            <TabsContent value="designer-works" className="mt-0">
                                <div className="flex flex-col gap-4 border-b border-white/6 pb-5 xl:flex-row xl:items-center xl:justify-between">
                                    <div>
                                        <h1 className="mt-5 text-3xl font-semibold text-white md:text-4xl">
                                            Готовые дизайны
                                        </h1>
                                        <p className="mt-2 text-sm text-zinc-500">
                                            {designerAssets.length} файлов
                                            {designerName
                                                ? ` от дизайнера ${designerName}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                    {visibleDesignerAssets.map((asset) => (
                                        <div
                                            key={asset.id}
                                            className="group relative overflow-hidden rounded-[1.5rem] border border-white/6 bg-slate-900/45 transition hover:border-emerald-500/25 hover:bg-slate-900/60"
                                            style={{
                                                contentVisibility: 'auto',
                                                containIntrinsicSize: '320px',
                                            }}
                                        >
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                className="block w-full cursor-pointer text-left"
                                                onClick={() => {
                                                    if (asset.previewUrl) {
                                                        setActiveImage(asset);

                                                        return;
                                                    }

                                                    window.open(
                                                        asset.url,
                                                        '_blank',
                                                        'noopener,noreferrer',
                                                    );
                                                }}
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === 'Enter' ||
                                                        event.key === ' '
                                                    ) {
                                                        event.preventDefault();

                                                        if (asset.previewUrl) {
                                                            setActiveImage(
                                                                asset,
                                                            );
                                                        } else {
                                                            window.open(
                                                                asset.url,
                                                                '_blank',
                                                                'noopener,noreferrer',
                                                            );
                                                        }
                                                    }
                                                }}
                                            >
                                                <div className="relative aspect-[4/3] overflow-hidden bg-black/30">
                                                    <PreviewThumb
                                                        name={asset.name}
                                                        previewUrl={
                                                            asset.previewUrl
                                                        }
                                                        url={asset.url}
                                                        mimeType={
                                                            asset.mimeType
                                                        }
                                                        className="h-full w-full rounded-none object-cover transition duration-300 group-hover:scale-[1.03]"
                                                    />
                                                </div>
                                                <div className="space-y-2 px-4 py-4">
                                                    <h3 className="line-clamp-2 text-sm font-medium text-white">
                                                        {asset.name}
                                                    </h3>
                                                    <p className="text-xs text-zinc-500">
                                                        {formatBytes(
                                                            asset.sizeBytes,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <a
                                                href={asset.url}
                                                download={asset.name}
                                                rel="noreferrer"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                                aria-label={`Скачать ${asset.name}`}
                                                className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/45 text-white backdrop-blur-sm transition hover:bg-emerald-500/20 hover:text-emerald-100"
                                            >
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                                {hasMoreDesignerAssets && (
                                    <div
                                        ref={designerAssetsSentinelRef}
                                        className="h-10"
                                        aria-hidden="true"
                                    />
                                )}
                            </TabsContent>
                        )}
                    </Tabs>
                </section>
            </div>

            <ProjectSourceImageViewer
                image={activeImage}
                open={activeImage !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveImage(null);
                    }
                }}
            />

            <Dialog
                open={imagePendingDeletion !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setImagePendingDeletion(null);
                    }
                }}
            >
                <DialogContent className="border border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur-sm sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-white">
                            Удалить исходник
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Файл{' '}
                            <span className="font-medium text-white">
                                {imagePendingDeletion?.name}
                            </span>{' '}
                            будет удален из проекта. Это действие нельзя
                            отменить.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                                Отмена
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            disabled={deleteSourceImageForm.processing}
                            className="bg-rose-500 text-white hover:bg-rose-600"
                            onClick={handleDeleteSourceImage}
                        >
                            Удалить файл
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

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
                    {formatBytes(state.bytesUploaded)} /{' '}
                    {formatBytes(state.bytesTotal)}
                </p>
            )}
            {state.error && (
                <p className="text-xs text-rose-400">{state.error}</p>
            )}
        </div>
    );
}

function SpecRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1.25rem] border border-white/6 bg-slate-900/45 p-4 backdrop-blur-sm">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-2 text-base font-black text-zinc-100">{value}</p>
        </div>
    );
}

function ProjectPublicLinkCard({
    title,
    description,
    href,
    copiedText,
    onCopy,
}: {
    title: string;
    description: string;
    href: string;
    copiedText: string | null;
    onCopy: (text: string) => Promise<boolean>;
}) {
    return (
        <div className="rounded-[1.25rem] border border-white/6 bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-zinc-200">
                    <Link2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                        {description}
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/6 bg-slate-950/45 p-3 text-sm break-all text-zinc-300">
                {href}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                    asChild
                    variant="outline"
                    className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 sm:w-auto"
                >
                    <a href={href} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Открыть
                    </a>
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 sm:w-auto"
                    onClick={() => {
                        void onCopy(href);
                    }}
                >
                    {copiedText === href ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                    ) : (
                        <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copiedText === href ? 'Скопировано' : 'Скопировать'}
                </Button>
            </div>
        </div>
    );
}

function PhotographerProjectTabs({
    showDesignerWorks,
}: {
    showDesignerWorks: boolean;
}) {
    return (
        <div className="mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="min-w-max">
                <TabsTrigger value="details" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Основная информация
                </TabsTrigger>
                <TabsTrigger value="source-images" className="gap-2">
                    <Images className="h-4 w-4" />
                    Исходники
                </TabsTrigger>
                {showDesignerWorks && (
                    <TabsTrigger value="designer-works" className="gap-2">
                        <Palette className="h-4 w-4" />
                        Готовые дизайны
                    </TabsTrigger>
                )}
            </TabsList>
        </div>
    );
}

function formatBytes(sizeBytes: number): string {
    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    if (sizeBytes < 1024 * 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatStageStatus(status: string): string {
    if (status === 'in_progress') {
        return 'Активный этап';
    }

    if (status === 'completed') {
        return 'Завершён';
    }

    return 'Запланирован';
}

function stageStatusBadgeClassName(status: string): string {
    if (status === 'in_progress') {
        return 'bg-emerald-500/10 text-emerald-200';
    }

    if (status === 'completed') {
        return 'bg-emerald-500/10 text-emerald-200';
    }

    return 'bg-white/5 text-zinc-400';
}

function stageStatusDotClassName(status: string): string {
    if (status === 'in_progress') {
        return 'bg-emerald-400';
    }

    if (status === 'completed') {
        return 'bg-emerald-400';
    }

    return 'bg-zinc-600';
}

function formatStageCompletedAt(value: string): string {
    return new Intl.DateTimeFormat('ru-KZ', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
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

    if (lastDotIndex === -1 || lastDotIndex === name.length - 1) {
        return '';
    }

    return name.slice(lastDotIndex + 1).toLowerCase();
}

function getFileTypeLabel(name: string, mimeType?: string | null): string {
    const extension = getFileExtension(name);

    if (extension !== '') {
        return extension.toUpperCase();
    }

    if (!mimeType) {
        return 'FILE';
    }

    return mimeType.split('/')[0]?.toUpperCase() || 'FILE';
}

function canRenderImagePreview(
    name: string,
    mimeType: string | null | undefined,
): boolean {
    if (mimeType && BROWSER_PREVIEWABLE_IMAGE_MIME_TYPES.has(mimeType)) {
        return true;
    }

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
                loading="lazy"
                decoding="async"
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

function PendingUploadThumb({
    name,
    mimeType,
}: {
    name: string;
    mimeType?: string | null;
}) {
    return (
        <div className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/5 px-2 text-zinc-300">
            {canRenderImagePreview(name, mimeType) ? (
                <ImagePlus className="h-6 w-6" />
            ) : (
                <>
                    <File className="h-5 w-5" />
                    <span className="max-w-full truncate text-[10px] font-semibold text-zinc-400 uppercase">
                        {getFileTypeLabel(name, mimeType)}
                    </span>
                </>
            )}
        </div>
    );
}
