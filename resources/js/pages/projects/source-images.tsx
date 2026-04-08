import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    ImagePlus,
    Upload,
} from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
    sizeBytes: number;
    uploadedAt: string | null;
};

type SelectedImagePreview = {
    id: string;
    name: string;
    sizeBytes: number;
    url: string;
};

type SourceImageForm = {
    images: File[];
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
            {
                title: 'Исходники',
                href: showProjectSourceImages(project.id),
            },
        ],
    });

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadTick, setUploadTick] = useState(0);
    const [activeImage, setActiveImage] = useState<SourceImageItem | null>(null);
    const [selectedPreviews, setSelectedPreviews] = useState<
        SelectedImagePreview[]
    >([]);
    const completeStageForm = useForm<Record<string, never>>({});
    const {
        data,
        setData,
        post,
        processing,
        progress,
        errors,
        reset,
        clearErrors,
    } = useForm<SourceImageForm>({
        images: [],
    });

    useEffect(() => {
        return () => {
            selectedPreviews.forEach((preview) => {
                URL.revokeObjectURL(preview.url);
            });
        };
    }, [selectedPreviews]);

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
        if (uploadTick === 0 || data.images.length === 0) {
            return;
        }

        post(storeProjectSourceImages.url(project.id), {
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
        if (processing || completeStageForm.processing) {
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

    return (
        <>
            <Head title={`Исходники | ${project.name}`} />

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
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
                        disabled={processing || completeStageForm.processing}
                        className="bg-orange-500 px-5 text-white hover:bg-orange-600"
                        onClick={openFilePicker}
                    >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Добавить фото
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
                                    {sourceImages.length} фото внутри
                                </p>
                                {workflow.currentStageName && (
                                    <p className="mt-1 text-sm text-zinc-500">
                                        Этап: {workflow.currentStageName}
                                    </p>
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
                            <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-white/6 bg-white/[0.03] px-6 py-8 text-center">
                                <p className="text-sm text-zinc-400">
                                    Когда все исходники загружены, нажми
                                    кнопку ниже
                                </p>
                                <Button
                                    type="button"
                                    size="lg"
                                    disabled={
                                        !workflow.canMarkReady
                                        || processing
                                        || completeStageForm.processing
                                    }
                                    className="mt-4 min-w-56 rounded-full bg-orange-500 px-8 text-white hover:bg-orange-600 disabled:bg-white/5 disabled:text-zinc-500"
                                    onClick={() => {
                                        completeStageForm.post(
                                            completeProjectSourceImages.url(project.id),
                                            {
                                                preserveScroll: true,
                                            },
                                        );
                                    }}
                                >
                                    Готово
                                </Button>
                                <p className="mt-3 text-xs text-zinc-500">
                                    {sourceImages.length === 0
                                        ? 'Сначала загрузите фото'
                                        : workflow.canMarkReady
                                          ? 'Проект перейдет на этап "Фотограф снял"'
                                          : 'Этап уже подтвержден'}
                                </p>
                            </div>

                            <div
                                role="button"
                                tabIndex={processing ? -1 : 0}
                                aria-label="Выбрать исходники"
                                className={cn(
                                    'w-full rounded-[1.75rem] border border-dashed px-6 py-12 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                                    isDragging
                                        ? 'border-orange-400 bg-orange-500/12'
                                        : 'border-white/10 bg-white/[0.03] hover:border-orange-500/35 hover:bg-orange-500/8',
                                    processing && 'cursor-wait opacity-80',
                                )}
                                onClick={openFilePicker}
                                onKeyDown={handleDropzoneKeyDown}
                                onDragEnter={(event) => {
                                    if (processing) {
                                        return;
                                    }

                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragOver={(event) => {
                                    if (processing) {
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
                                    if (processing) {
                                        return;
                                    }

                                    event.preventDefault();
                                    queueImages(
                                        Array.from(event.dataTransfer.files),
                                    );
                                }}
                            >
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/20  text-orange-300">
                                    {processing ? (
                                        <Upload className="h-6 w-6 animate-bounce" />
                                    ) : selectedPreviews.length > 0 ? (
                                        <CheckCircle2 className="h-6 w-6" />
                                    ) : (
                                        <ImagePlus className="h-6 w-6" />
                                    )}
                                </div>

                                <h2 className="mt-4 text-2xl font-semibold text-white">
                                    {processing
                                        ? 'Загрузка...'
                                        : 'Нажми сюда или перетащи фото'}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-zinc-400">
                                    {processing
                                        ? 'Фотографии уже загружаются'
                                        : 'Можно выбрать сразу несколько изображений'}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                    disabled={processing || completeStageForm.processing}
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

                            {progress && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm text-orange-300">
                                        <span>Загрузка</span>
                                        <span>{progress.percentage}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-orange-500 transition-all"
                                            style={{
                                                width: `${progress.percentage}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedPreviews.length > 0 && (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                    {selectedPreviews.map((preview) => (
                                        <div
                                            key={preview.id}
                                            className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.03] p-3"
                                        >
                                            <img
                                                src={preview.url}
                                                alt={preview.name}
                                                className="h-14 w-14 rounded-xl object-cover"
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
                                    ))}
                                </div>
                            )}

                            {sourceImages.length === 0 ? (
                                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
                                    <h2 className="text-lg font-medium text-white">
                                        Пока пусто
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                                        Добавьте первые фотографии
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                    {sourceImages.map((image) => (
                                        <button
                                            key={image.id}
                                            type="button"
                                            className="group overflow-hidden rounded-[1.5rem] border border-white/6 bg-white/[0.03] text-left transition hover:border-orange-500/25 hover:bg-white/[0.05]"
                                            onClick={() => setActiveImage(image)}
                                        >
                                            <div className="relative aspect-[4/3] overflow-hidden bg-black/30">
                                                <img
                                                    src={image.url}
                                                    alt={image.name}
                                                    className="h-full w-full cursor-zoom-in object-cover transition duration-300 group-hover:scale-[1.03]"
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

            <Dialog
                open={activeImage !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveImage(null);
                    }
                }}
            >
                <DialogContent
                    showCloseButton
                    className="max-h-[92vh] max-w-[min(96vw,1400px)] gap-4 overflow-hidden border border-white/10 bg-[#050505] p-4 sm:p-5"
                >
                    {activeImage && (
                        <>
                            <div className="overflow-hidden rounded-[1.5rem] border border-white/8 bg-black">
                                <img
                                    src={activeImage.url}
                                    alt={activeImage.name}
                                    className="max-h-[78vh] w-full object-contain"
                                />
                            </div>

                            <div className="space-y-1 px-1">
                                <DialogTitle className="truncate text-base text-white sm:text-lg">
                                    {activeImage.name}
                                </DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    {formatBytes(activeImage.sizeBytes)}
                                </DialogDescription>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function formatBytes(sizeBytes: number): string {
    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
