import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, ImagePlus, Upload, WandSparkles } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { index as montageProjectIndex } from '@/actions/App/Http/Controllers/MontageProjectController';
import { complete as completeMontageWorks, replace as replaceMontageWork, show as showMontageWorks, store as storeMontageWorks } from '@/actions/App/Http/Controllers/ProjectMontageAssetController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
    sizeBytes: number;
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

type Props = {
    project: ProjectSummary;
    montageAssets: MontageAssetItem[];
    workflow: {
        currentStageName: string | null;
        currentStageSlug: string | null;
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
    workflow,
    clientReview,
    status,
}: Props) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Монтаж',
                href: montageProjectIndex(),
            },
            {
                title: project.name,
                href: showMontageWorks(project.id),
            },
        ],
    });

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadTick, setUploadTick] = useState(0);
    const [activeImage, setActiveImage] = useState<MontageAssetItem | null>(null);
    const [selectedPreviews, setSelectedPreviews] = useState<SelectedImagePreview[]>([]);
    const completeStageForm = useForm<Record<string, never>>({});
    const replaceForm = useForm<ReplaceMontageAssetForm>({
        image: null,
    });
    const revisionCommentsByAssetId = useMemo(
        () => new Map(clientReview.requestedAssets.map((asset) => [asset.id, asset.comment])),
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
    } = useForm<MontageAssetForm>({
        images: [],
    });

    const resetSelection = () => {
        selectedPreviews.forEach((preview) => {
            URL.revokeObjectURL(preview.url);
        });

        setSelectedPreviews([]);
        reset();
        clearErrors();

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const handleUploadSuccess = useEffectEvent(() => {
        resetSelection();
    });

    useEffect(() => {
        return () => {
            selectedPreviews.forEach((preview) => {
                URL.revokeObjectURL(preview.url);
            });
        };
    }, [selectedPreviews]);

    useEffect(() => {
        if (uploadTick === 0 || data.images.length === 0) {
            return;
        }

        post(storeMontageWorks.url(project.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                handleUploadSuccess();
            },
        });
    }, [data.images.length, post, project.id, uploadTick]);

    const queueImages = (images: File[]) => {
        resetSelection();
        setIsDragging(false);

        if (images.length === 0) {
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
    };

    const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
        queueImages(Array.from(event.target.files ?? []));
    };

    const openFilePicker = () => {
        if (processing || completeStageForm.processing || workflow.currentStageSlug !== 'montage') {
            return;
        }

        fileInputRef.current?.click();
    };

    const openReplaceFilePicker = () => {
        if (
            activeImage === null
            || !activeImage.requestedForRevision
            || replaceForm.processing
            || workflow.currentStageSlug !== 'montage'
        ) {
            return;
        }

        replaceFileInputRef.current?.click();
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
    const activeImageComment = activeImage === null
        ? null
        : revisionCommentsByAssetId.get(activeImage.id) ?? null;

    const handleReplaceFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        if (file === null || activeImage === null) {
            return;
        }

        replaceForm.transform(() => ({
            image: file,
        }));

        replaceForm.post(replaceMontageWork.url([project.id, activeImage.id]), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                replaceForm.reset();
                replaceForm.clearErrors();
                replaceForm.transform((data) => data);

                if (replaceFileInputRef.current) {
                    replaceFileInputRef.current.value = '';
                }
            },
            onError: () => {
                replaceForm.transform((data) => data);
            },
        });
    };

    return (
        <>
            <Head title={`Монтаж | ${project.name}`} />

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={montageProjectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад
                    </Link>

                    <Button
                        type="button"
                        size="lg"
                        disabled={processing || completeStageForm.processing || workflow.currentStageSlug !== 'montage'}
                        className="bg-orange-500 px-5 text-white hover:bg-orange-600"
                        onClick={openFilePicker}
                    >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Добавить готовые работы
                    </Button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    name="images"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileSelection}
                />
                <input
                    ref={replaceFileInputRef}
                    type="file"
                    name="image"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleReplaceFileSelection}
                />

                <section>
                    <div className="flex flex-col gap-4 border-b border-white/6 pb-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant="outline"
                                className="border-orange-500/20 bg-orange-500/10 text-orange-200"
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
                                <h1 className="text-3xl font-semibold tracking-tight text-white">
                                    {project.name}
                                </h1>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Фотограф: {project.photographerName ?? 'Не указан'}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Этап: {workflow.currentStageName ?? 'Неизвестно'}
                                </p>
                            </div>

                            {workflow.canMarkReady && (
                                <Button
                                    type="button"
                                    disabled={completeStageForm.processing || montageAssets.length === 0}
                                    className="bg-white/10 text-white hover:bg-white/15"
                                    onClick={() => {
                                        completeStageForm.post(completeMontageWorks.url(project.id), {
                                            preserveScroll: true,
                                        });
                                    }}
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Отправить модератору
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



                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Выбрать готовые работы"
                            className={cn(
                                'flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                                isDragging
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-white/10 bg-white/[0.02]',
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
                            <div className="rounded-full bg-orange-500/10 p-3 text-orange-300">
                                <Upload className="h-6 w-6" />
                            </div>
                            <p className="mt-4 text-base font-medium text-white">
                                Перетащите готовые работы сюда
                            </p>
                            <p className="mt-2 max-w-xs text-sm text-zinc-500">
                                Поддерживаются JPG, PNG и WEBP до 10 МБ за файл.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                disabled={processing || completeStageForm.processing || workflow.currentStageSlug !== 'montage'}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    openFilePicker();
                                }}
                            >
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Выбрать файлы
                            </Button>
                        </div>

                        {montageAssets.map((asset) => (
                            <button
                                key={asset.id}
                                type="button"
                                className="group overflow-hidden rounded-[1.5rem] border border-white/6 bg-white/[0.03] text-left transition hover:border-orange-500/30"
                                onClick={() => setActiveImage(asset)}
                            >
                                <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                                    <img
                                        src={asset.url}
                                        alt={asset.name}
                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                    />
                                    {asset.requestedForRevision && (
                                        <div className="pointer-events-none absolute left-3 top-3">
                                            <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-orange-500/20">
                                                Нужна правка
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 p-4">
                                    <p className="line-clamp-2 text-sm font-medium text-white">
                                        {asset.name}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {formatBytes(asset.sizeBytes)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {progress && (
                        <div className="mt-4 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                            Загрузка: {progress.percentage}%
                        </div>
                    )}

                    {montageAssets.length === 0 && (
                        <div className="mt-6 rounded-[1.5rem] border border-white/6 bg-white/[0.02] px-6 py-10 text-center">
                            <div className="mx-auto w-fit rounded-full bg-orange-500/10 p-3 text-orange-300">
                                <WandSparkles className="h-6 w-6" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-white">
                                Готовые работы еще не загружены
                            </h2>
                            <p className="mt-2 text-sm text-zinc-500">
                                Загрузите результат монтажа и затем отправьте проект
                                модератору.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <Dialog open={activeImage !== null} onOpenChange={(open) => !open && setActiveImage(null)}>
                <DialogContent className="max-w-4xl border-white/10 bg-zinc-950 text-white">
                    <DialogTitle>{activeImage?.name ?? 'Превью'}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Просмотр загруженной готовой работы и замечаний клиента по этому файлу.
                    </DialogDescription>

                    {activeImage && (
                        <div className="space-y-4">
                            <img
                                src={activeImage.url}
                                alt={activeImage.name}
                                className="mt-2 max-h-[75vh] w-full rounded-2xl object-contain"
                            />

                            {activeImage.requestedForRevision && (
                                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className="border-orange-500/20 bg-orange-500/10 text-orange-200"
                                        >
                                            Клиент просит правку
                                        </Badge>
                                    </div>
                                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-200">
                                        {activeImageComment?.trim() || 'Клиент отметил эту работу для правки без отдельного комментария.'}
                                    </p>

                                    {workflow.currentStageSlug === 'montage' && (
                                        <Button
                                            type="button"
                                            disabled={replaceForm.processing}
                                            className="mt-4 bg-orange-500 text-white hover:bg-orange-600"
                                            onClick={openReplaceFilePicker}
                                        >
                                            <ImagePlus className="mr-2 h-4 w-4" />
                                            {replaceForm.processing ? 'Замена...' : 'Заменить эту работу'}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function formatBytes(sizeBytes: number): string {
    if (sizeBytes >= 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
    }

    return `${Math.max(1, Math.round(sizeBytes / 1024))} КБ`;
}
