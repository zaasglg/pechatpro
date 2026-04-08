import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Expand, Send, WandSparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { submit, toggleSelection } from '@/actions/App/Http/Controllers/ProjectMontageReviewController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ImageItem = {
    id: number;
    name: string;
    url: string;
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

export default function ClientMontageReviewShow({ project, images, status }: Props) {
    const page = usePage<{ errors?: Record<string, string> }>();
    const [activeImageId, setActiveImageId] = useState<number | null>(null);
    const activeImageIndex = images.findIndex((image) => image.id === activeImageId);
    const activeImage = activeImageIndex >= 0 ? images[activeImageIndex] : null;
    const selectedIds = new Set(
        images
            .filter((image) => image.selectedForRevision)
            .map((image) => image.id),
    );
    const isSubmitted = project.reviewSubmittedAt !== null;
    const form = useForm<{
        comments: Record<string, string>;
    }>({
        comments: buildSelectedComments(images),
    });
    const commentErrors = page.props.errors
        ? Object.entries(page.props.errors).filter(([key]) => key.startsWith('comments.'))
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
            <Head title={`Проверка работ | ${project.name}`} />

            <div className="min-h-screen bg-[#050505] px-4 py-5 text-white md:px-8 md:py-8">
                <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
                    <section className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-5 md:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-4">
                                <Badge
                                    variant="outline"
                                    className="border-orange-500/20 bg-orange-500/10 text-orange-200"
                                >
                                    {project.className}
                                </Badge>

                                <div className="space-y-2">
                                    <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                                        {project.name}
                                    </h1>
                                    <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                                        Отметьте только те работы, которые нужно доработать. У каждой выбранной работы можно оставить отдельный комментарий, чтобы монтажёр сразу понял, что именно исправить.
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                disabled={form.processing || isSubmitted}
                                className="h-12 rounded-full bg-orange-500 px-6 text-base text-white hover:bg-orange-600 disabled:bg-white/8 disabled:text-zinc-500"
                                onClick={handleSubmit}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                {isSubmitted ? 'Замечания отправлены' : 'Отправить замечания'}
                            </Button>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            <InfoCard
                                label="Отмечено для правки"
                                value={`${selectedIds.size}`}
                                hint={formatWorkCount(selectedIds.size)}
                            />
                            <InfoCard
                                label="Работ в подборке"
                                value={`${images.length}`}
                                hint="Нажмите на кадр, чтобы открыть его крупно"
                            />
                            <InfoCard
                                label="Статус"
                                value={isSubmitted ? 'Отправлено' : 'Ожидает ответа'}
                                hint={isSubmitted ? 'Модератор уже получил ваш ответ' : 'После отправки замечания уйдут модератору'}
                            />
                        </div>
                    </section>

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
                            Проверьте комментарии у отмеченных работ.
                        </div>
                    )}

                    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {images.map((image) => {
                                const isSelected = selectedIds.has(image.id);

                                return (
                                    <article
                                        key={image.id}
                                        className={cn(
                                            'group overflow-hidden rounded-[1.75rem] border bg-white/[0.03] transition',
                                            isSelected
                                                ? 'border-orange-500/30 shadow-[0_0_0_1px_rgba(249,115,22,0.14)]'
                                                : 'border-white/6 hover:border-white/12',
                                        )}
                                    >
                                        <div className="relative aspect-[4/4.8] overflow-hidden bg-black/40">
                                            <button
                                                type="button"
                                                className="h-full w-full text-left"
                                                onClick={() => setActiveImageId(image.id)}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.name}
                                                    className="h-full w-full object-cover [transform:translateZ(0)]"
                                                />
                                                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
                                                    {isSelected && (
                                                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-orange-500/20">
                                                            Нужна правка
                                                        </span>
                                                    )}
                                                    <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                        <Expand className="h-3.5 w-3.5" />
                                                        Открыть
                                                    </span>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="space-y-3 p-3">
                                            <Button
                                                type="button"
                                                disabled={isSubmitted}
                                                className={cn(
                                                    'h-11 w-full rounded-full',
                                                    isSelected
                                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                        : 'bg-white/5 text-white hover:bg-white/10',
                                                )}
                                                onClick={() => handleToggleSelection(image.id)}
                                            >
                                                <WandSparkles className="mr-2 h-4 w-4" />
                                                {isSelected ? 'Отмечено для правки' : 'Нужно исправить'}
                                            </Button>

                                            {isSelected && (
                                                <div className="space-y-2">
                                                    <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                                        Что исправить в этой работе
                                                    </label>
                                                    <textarea
                                                        value={form.data.comments[String(image.id)] ?? ''}
                                                        disabled={isSubmitted}
                                                        onChange={(event) =>
                                                            form.setData('comments', {
                                                                ...form.data.comments,
                                                                [String(image.id)]: event.target.value,
                                                            })
                                                        }
                                                        rows={4}
                                                        placeholder="Например: сместить заголовок, заменить фото или усилить контраст."
                                                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"
                                                    />
                                                    {page.props.errors?.[`comments.${image.id}`] && (
                                                        <p className="text-sm text-rose-300">
                                                            {page.props.errors[`comments.${image.id}`]}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                                <h2 className="text-lg font-semibold text-white">
                                    Как оставить правки
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-zinc-400">
                                    Выберите только нужные работы. Комментарий добавляется отдельно у каждой карточки, поэтому не нужно собирать все замечания в одном общем сообщении.
                                </p>

                                <div className="mt-5 space-y-3">
                                    <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                            Выбрано для правки
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-white">
                                            {selectedIds.size}
                                        </p>
                                    </div>

                                    {selectedIds.size > 0 ? (
                                        <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
                                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                                Отмеченные работы
                                            </p>
                                            <div className="mt-3 space-y-3">
                                                {images
                                                    .filter((image) => image.selectedForRevision)
                                                    .map((image) => (
                                                        <div
                                                            key={image.id}
                                                            className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3"
                                                        >
                                                            <p className="truncate text-sm font-medium text-white">
                                                                {image.name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-zinc-400">
                                                                {form.data.comments[String(image.id)]?.trim()
                                                                    ? 'Комментарий добавлен'
                                                                    : 'Комментарий можно добавить в карточке фото'}
                                                            </p>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm leading-6 text-zinc-500">
                                            Если правок нет, просто отправьте результат без отмеченных работ.
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    disabled={form.processing || isSubmitted}
                                    className="mt-4 h-11 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:bg-white/8 disabled:text-zinc-500"
                                    onClick={handleSubmit}
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {isSubmitted ? 'Замечания отправлены' : 'Отправить замечания'}
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
                    className="max-h-[94vh] max-w-[min(96vw,1500px)] gap-4 overflow-y-auto border border-white/10 bg-[#050505] p-4 text-white sm:p-5"
                >
                    {activeImage && (
                        <>
                            <div className="flex items-start justify-between gap-4 pr-10">
                                <div className="space-y-1">
                                    <DialogTitle className="text-base text-white sm:text-lg">
                                        Просмотр готовой работы
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Кадр {activeImageIndex + 1} из {images.length}. Откройте работу крупно и при необходимости отметьте её для доработки.
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/8 bg-black p-4 sm:p-6">
                                <img
                                    src={activeImage.url}
                                    alt={activeImage.name}
                                    className="h-auto max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
                                />

                                {activeImageIndex > 0 && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="absolute left-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-white/10 bg-black/70 text-white hover:bg-black/85 sm:left-4"
                                        onClick={() => setActiveImageId(images[activeImageIndex - 1].id)}
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                        <span className="sr-only">Предыдущая работа</span>
                                    </Button>
                                )}

                                {activeImageIndex < images.length - 1 && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="absolute right-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-white/10 bg-black/70 text-white hover:bg-black/85 sm:right-4"
                                        onClick={() => setActiveImageId(images[activeImageIndex + 1].id)}
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                        <span className="sr-only">Следующая работа</span>
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-zinc-400">
                                    {selectedIds.has(activeImage.id)
                                        ? 'Эта работа уже отмечена для доработки.'
                                        : 'Если требуется изменение, отметьте эту работу для правки.'}
                                </div>

                                <Button
                                    type="button"
                                    disabled={isSubmitted}
                                    className={cn(
                                        'h-11 rounded-full px-5',
                                        selectedIds.has(activeImage.id)
                                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                                            : 'bg-white/5 text-white hover:bg-white/10',
                                    )}
                                    onClick={() => handleToggleSelection(activeImage.id)}
                                >
                                    <WandSparkles className="mr-2 h-4 w-4" />
                                    {selectedIds.has(activeImage.id) ? 'Отмечено для правки' : 'Нужно исправить'}
                                </Button>
                            </div>

                            {selectedIds.has(activeImage.id) && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                        Комментарий к этой работе
                                    </label>
                                    <textarea
                                        value={form.data.comments[String(activeImage.id)] ?? ''}
                                        disabled={isSubmitted}
                                        onChange={(event) =>
                                            form.setData('comments', {
                                                ...form.data.comments,
                                                [String(activeImage.id)]: event.target.value,
                                            })
                                        }
                                        rows={4}
                                        placeholder="Например: сместить текст, заменить фото или усилить контраст."
                                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"
                                    />
                                    {page.props.errors?.[`comments.${activeImage.id}`] && (
                                        <p className="text-sm text-rose-300">
                                            {page.props.errors[`comments.${activeImage.id}`]}
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

function InfoCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint: string;
}) {
    return (
        <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                {label}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{value}</p>
            <p className="mt-1 text-sm text-zinc-400">{hint}</p>
        </div>
    );
}

function formatWorkCount(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'работа отмечена';
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'работы отмечены';
    }

    return 'работ отмечено';
}
