import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Expand,
    ImageIcon,
    Send,
    WandSparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    submit,
    toggleSelection,
} from '@/actions/App/Http/Controllers/ProjectMontageReviewController';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useProgressiveList } from '@/hooks/use-progressive-list';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

type ImageItem = {
    id: number;
    name: string;
    url: string;
    previewUrl: string | null;
    mimeType: string | null;
    sizeBytes: number;
    selectedForRevision: boolean;
    comment: string | null;
};

type Props = {
    project: {
        id: number;
        name: string;
        className: string;
        token: string;
        reviewSubmittedAt: string | null;
    };
    images: ImageItem[];
    status?: string | null;
};

export default function ClientMontageReviewShow({
    project,
    images,
    status,
}: Props) {
    const { t } = useTranslations();
    const page = usePage<{ errors?: Record<string, string> }>();
    const [activeImageId, setActiveImageId] = useState<number | null>(null);
    const activeImageIndex = images.findIndex(
        (image) => image.id === activeImageId,
    );
    const activeImage = activeImageIndex >= 0 ? images[activeImageIndex] : null;
    const {
        hasMore: hasMoreImages,
        loadMore: loadMoreImages,
        remainingCount: remainingImagesCount,
        visibleItems: visibleImages,
    } = useProgressiveList(images, {
        initialCount: 50,
        incrementBy: 50,
    });
    const selectedIds = new Set(
        images
            .filter((image) => image.selectedForRevision)
            .map((image) => image.id),
    );
    const selectedCount = selectedIds.size;
    const isSubmitted = project.reviewSubmittedAt !== null;
    const form = useForm<{
        comments: Record<string, string>;
    }>({
        comments: buildSelectedComments(images),
    });
    const commentErrors = page.props.errors
        ? Object.entries(page.props.errors).filter(([key]) =>
              key.startsWith('comments.'),
          )
        : [];

    useEffect(() => {
        const nextComments = buildSelectedComments(images, form.data.comments);

        if (!hasSameComments(form.data.comments, nextComments)) {
            form.setData('comments', nextComments);
        }
    }, [form, form.data.comments, images]);

    const handleToggleSelection = (assetId: number) => {
        router.post(
            toggleSelection.url(project.token),
            { asset_id: assetId },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const handleSubmit = () => {
        form.post(submit.url(project.token), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`${t('client_review.meta_title')} | ${project.name}`} />

            <div className="min-h-screen bg-[#101a2d] px-4 py-5 text-white md:px-8 md:py-8">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
                    <div className="flex justify-end">
                        <LanguageSwitcher />
                    </div>

                    {status && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {status}
                        </div>
                    )}

                    {page.props.errors?.asset_id && (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {page.props.errors.asset_id}
                        </div>
                    )}

                    {commentErrors.length > 0 && (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {t('client_review.error.comments_summary')}
                        </div>
                    )}

                    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                                {visibleImages.map((image) => {
                                    const isSelected = selectedIds.has(image.id);

                                    return (
                                        <button
                                            key={image.id}
                                            type="button"
                                            title={image.name}
                                            onClick={() => setActiveImageId(image.id)}
                                            className={cn(
                                                'group relative aspect-square overflow-hidden rounded-xl border bg-slate-900/45 text-left transition',
                                                isSelected
                                                    ? 'border-emerald-500/60 shadow-[0_0_0_1px_rgba(16,185,129,0.24)]'
                                                    : 'border-white/6 hover:border-white/20',
                                            )}
                                            style={{
                                                contentVisibility: 'auto',
                                                containIntrinsicSize: '170px',
                                            }}
                                        >
                                            {image.previewUrl ? (
                                                <img
                                                    src={image.previewUrl}
                                                    alt={image.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    fetchPriority="low"
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-zinc-600">
                                                    <ImageIcon className="h-8 w-8" />
                                                </div>
                                            )}
                                            {isSelected && (
                                                <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg shadow-emerald-500/20">
                                                    {t('client_review.card.revision_badge')}
                                                </span>
                                            )}
                                            <span className="pointer-events-none absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                <Expand className="h-3 w-3" />
                                                {t('client_review.card.open')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {hasMoreImages && (
                                <LoadMoreImagesButton
                                    remainingCount={remainingImagesCount}
                                    onClick={loadMoreImages}
                                />
                            )}
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-5 backdrop-blur-sm">
                                <h2 className="text-lg font-semibold text-white">
                                    {t('client_review.sidebar.title')}
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-zinc-400">
                                    {t('client_review.sidebar.description')}
                                </p>

                                <div className="mt-5 space-y-3">
                                    <div className="rounded-2xl border border-white/6 bg-slate-950/45 px-4 py-3">
                                        <p className="] text-xs text-zinc-500 uppercase">
                                            {t('client_review.sidebar.selected_label')}
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-white">
                                            {selectedCount}
                                        </p>
                                    </div>

                                    {selectedCount > 0 ? (
                                        <div className="rounded-2xl border border-white/6 bg-slate-950/45 p-4">
                                            <p className="] text-xs text-zinc-500 uppercase">
                                                {t('client_review.sidebar.marked_label')}
                                            </p>
                                            <div className="mt-3 space-y-3">
                                                {images
                                                    .filter(
                                                        (image) =>
                                                            image.selectedForRevision,
                                                    )
                                                    .map((image) => (
                                                        <div
                                                            key={image.id}
                                                            className="rounded-2xl border border-white/6 bg-slate-900/35 px-3 py-3"
                                                        >
                                                            <p className="truncate text-sm font-medium text-white">
                                                                {image.name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-zinc-400">
                                                                {form.data.comments[
                                                                    String(
                                                                        image.id,
                                                                    )
                                                                ]?.trim()
                                                                    ? t('client_review.sidebar.comment_added')
                                                                    : t('client_review.sidebar.comment_hint')}
                                                            </p>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm leading-6 text-zinc-500">
                                            {t('client_review.sidebar.empty_hint')}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    disabled={form.processing || isSubmitted}
                                    className="mt-4 h-11 w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-white/8 disabled:text-zinc-500"
                                    onClick={handleSubmit}
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {isSubmitted
                                        ? selectedCount > 0
                                            ? t('client_review.button.sent')
                                            : t('client_review.button.confirmed')
                                        : selectedCount > 0
                                          ? t('client_review.button.send_comments')
                                          : t('client_review.button.confirm')}
                                </Button>
                            </div>
                        </aside>
                    </section>
                </div>
            </div>

            <Dialog
                open={activeImage !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveImageId(null);
                    }
                }}
            >
                <DialogContent
                    showCloseButton
                    className="max-h-[94vh] max-w-[min(96vw,1500px)] gap-4 overflow-y-auto border border-white/10 bg-slate-950/95 p-4 text-white backdrop-blur-sm sm:p-5"
                >
                    {activeImage && (
                        <>
                            <div className="flex items-start justify-between gap-4 pr-10">
                                <div className="space-y-1">
                                    <DialogTitle className="text-base text-white sm:text-lg">
                                        {t('client_review.modal.title')}
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        {t('client_review.modal.description')
                                            .replace(':current', String(activeImageIndex + 1))
                                            .replace(':total', String(images.length))}
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/8 bg-black p-4 sm:p-6">
                                <img
                                    src={activeImage.previewUrl ?? activeImage.url}
                                    alt={activeImage.name}
                                    decoding="async"
                                    className="h-auto max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
                                />

                                {activeImageIndex > 0 && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="absolute top-1/2 left-3 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-white/10 bg-black/70 text-white hover:bg-black/85 sm:left-4"
                                        onClick={() =>
                                            setActiveImageId(
                                                images[activeImageIndex - 1].id,
                                            )
                                        }
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                        <span className="sr-only">
                                            {t('client_review.modal.prev')}
                                        </span>
                                    </Button>
                                )}

                                {activeImageIndex < images.length - 1 && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="absolute top-1/2 right-3 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-white/10 bg-black/70 text-white hover:bg-black/85 sm:right-4"
                                        onClick={() =>
                                            setActiveImageId(
                                                images[activeImageIndex + 1].id,
                                            )
                                        }
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                        <span className="sr-only">
                                            {t('client_review.modal.next')}
                                        </span>
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-zinc-400">
                                    {selectedIds.has(activeImage.id)
                                        ? t('client_review.modal.already_marked')
                                        : t('client_review.modal.needs_fix_hint')}
                                </div>

                                <Button
                                    type="button"
                                    disabled={isSubmitted}
                                    className={cn(
                                        'h-11 rounded-full px-5',
                                        selectedIds.has(activeImage.id)
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-white/5 text-white hover:bg-white/10',
                                    )}
                                    onClick={() =>
                                        handleToggleSelection(activeImage.id)
                                    }
                                >
                                    <WandSparkles className="mr-2 h-4 w-4" />
                                    {selectedIds.has(activeImage.id)
                                        ? t('client_review.button.marked')
                                        : t('client_review.button.need_fix')}
                                </Button>
                            </div>

                            {selectedIds.has(activeImage.id) && (
                                <div className="space-y-2">
                                    <label className="] text-xs text-zinc-500 uppercase">
                                        {t('client_review.modal.comment_label')}
                                    </label>
                                    <textarea
                                        value={
                                            form.data.comments[
                                                String(activeImage.id)
                                            ] ?? ''
                                        }
                                        disabled={isSubmitted}
                                        onChange={(event) =>
                                            form.setData('comments', {
                                                ...form.data.comments,
                                                [String(activeImage.id)]:
                                                    event.target.value,
                                            })
                                        }
                                        rows={4}
                                        placeholder={t('client_review.modal.comment_placeholder')}
                                        className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white transition outline-none placeholder:text-zinc-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                                    />
                                    {page.props.errors?.[
                                        `comments.${activeImage.id}`
                                    ] && (
                                        <p className="text-sm text-rose-300">
                                            {
                                                page.props.errors[
                                                    `comments.${activeImage.id}`
                                                ]
                                            }
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
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
                className="rounded-full border-white/10 bg-slate-950/50 px-5 text-white hover:bg-white/10"
                onClick={onClick}
            >
                Показать ещё {Math.min(50, remainingCount)}
            </Button>
        </div>
    );
}

function buildSelectedComments(
    images: ImageItem[],
    currentComments: Record<string, string> = {},
): Record<string, string> {
    return Object.fromEntries(
        images
            .filter((image) => image.selectedForRevision)
            .map((image) => [
                String(image.id),
                currentComments[String(image.id)] ?? image.comment ?? '',
            ]),
    );
}

function hasSameComments(
    currentComments: Record<string, string>,
    nextComments: Record<string, string>,
): boolean {
    const currentKeys = Object.keys(currentComments);
    const nextKeys = Object.keys(nextComments);

    if (currentKeys.length !== nextKeys.length) {
        return false;
    }

    return nextKeys.every((key) => currentComments[key] === nextComments[key]);
}
