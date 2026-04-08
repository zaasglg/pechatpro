import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Expand,
    Heart,
    Images,
    Send,
} from 'lucide-react';
import { useState } from 'react';
import { submitSelection, toggleSelection } from '@/actions/App/Http/Controllers/ProjectClientSelectionController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Slot = {
    id: number;
    name: string;
    maxLikes: number;
    selectedImageIds: number[];
};

type ImageItem = {
    id: number;
    name: string;
    url: string;
    sizeBytes: number;
};

type Props = {
    project: {
        id: number;
        name: string;
        className: string;
        token: string;
        clientSelectionSubmittedAt: string | null;
    };
    slots: Slot[];
    images: ImageItem[];
    status?: string | null;
};

export default function ClientProjectShow({ project, slots, images, status }: Props) {
    const page = usePage<{ errors?: Record<string, string> }>();
    const [activeSlotId, setActiveSlotId] = useState<number | null>(
        slots[0]?.id ?? null,
    );
    const [activeImageId, setActiveImageId] = useState<number | null>(null);

    const hasSlots = slots.length > 0;
    const isSubmitted = project.clientSelectionSubmittedAt !== null;
    const activeSlot = slots.find((slot) => slot.id === activeSlotId) ?? slots[0];
    const selectedImageIds = new Set(activeSlot?.selectedImageIds ?? []);
    const allSlotsCompleted = hasSlots && slots.every((slot) => slot.selectedImageIds.length === slot.maxLikes);
    const completedSlotsCount = slots.filter((slot) => slot.selectedImageIds.length === slot.maxLikes).length;
    const activeSlotIsFull = activeSlot !== undefined && activeSlot.selectedImageIds.length >= activeSlot.maxLikes;
    const activeImageIndex = images.findIndex((image) => image.id === activeImageId);
    const activeImage = activeImageIndex >= 0 ? images[activeImageIndex] : null;

    const handleToggleSelection = (imageId: number) => {
        if (!activeSlot) {
            return;
        }

        router.post(
            toggleSelection.url(project.token),
            {
                slot_id: activeSlot.id,
                source_image_id: imageId,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const handleSubmit = () => {
        router.post(
            submitSelection.url(project.token),
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <>
            <Head title={`Выбор фото | ${project.name}`} />

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
                                        Выберите лучшие фотографии для каждого блока. Когда все блоки будут заполнены, отправьте выбор кнопкой «Готово».
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                disabled={!allSlotsCompleted || isSubmitted}
                                className="h-12 rounded-full bg-orange-500 px-6 text-base text-white hover:bg-orange-600 disabled:bg-white/8 disabled:text-zinc-500"
                                onClick={handleSubmit}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                {isSubmitted ? 'Выбор отправлен' : 'Готово'}
                            </Button>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                    Прогресс
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">
                                    {completedSlotsCount} из {slots.length}
                                </p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    {formatSlotCount(slots.length)}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                    Активный блок
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">
                                    {activeSlot?.name ?? 'Не выбран'}
                                </p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    {activeSlot
                                        ? `Можно выбрать ${activeSlot.maxLikes} ${formatPhotoCount(activeSlot.maxLikes)}`
                                        : 'Сначала выберите блок'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                    Фото в галерее
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">
                                    {images.length}
                                </p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Нажмите на кадр, чтобы открыть его крупно
                                </p>
                            </div>
                        </div>
                    </section>

                    {status && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {status}
                        </div>
                    )}

                    {page.props.errors?.source_image_id && (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {page.props.errors.source_image_id}
                        </div>
                    )}

                    {page.props.errors?.selection && (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {page.props.errors.selection}
                        </div>
                    )}

                    <section className="space-y-5">
                        <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-4 md:p-5">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Images className="h-4 w-4 text-orange-400" />
                                    <h2 className="text-base font-semibold text-white">
                                        Блоки выбора
                                    </h2>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {slots.map((slot) => {
                                        const isActive = slot.id === activeSlot?.id;
                                        const isCompleted = slot.selectedImageIds.length === slot.maxLikes;

                                        return (
                                            <button
                                                key={slot.id}
                                                type="button"
                                                className={cn(
                                                    'min-w-[220px] flex-1 rounded-2xl border px-4 py-4 text-left transition md:flex-none md:basis-[240px]',
                                                    isActive
                                                        ? 'border-orange-500/30 bg-orange-500/10'
                                                        : 'border-white/6 bg-black/20 hover:border-white/12 hover:bg-white/[0.03]',
                                                )}
                                                onClick={() => setActiveSlotId(slot.id)}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-2">
                                                        <p className="text-lg font-medium text-white">
                                                            {slot.name}
                                                        </p>
                                                        <p className="text-sm text-zinc-400">
                                                            Выбрано {slot.selectedImageIds.length} из {slot.maxLikes}
                                                        </p>
                                                    </div>

                                                    {isCompleted ? (
                                                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-orange-400" />
                                                    ) : isActive ? (
                                                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400" />
                                                    ) : null}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                                    {isSubmitted ? (
                                        <>
                                            Выбор отправлен модератору. Лайки больше нельзя менять.
                                        </>
                                    ) : activeSlot ? (
                                        <>
                                            Сейчас открыт блок{' '}
                                            <span className="font-medium text-white">
                                                {activeSlot.name}
                                            </span>
                                            . Выберите до{' '}
                                            <span className="font-medium text-white">
                                                {activeSlot.maxLikes} {formatPhotoCount(activeSlot.maxLikes)}
                                            </span>
                                            .
                                        </>
                                    ) : (
                                        'Сначала выберите блок, для которого хотите отметить фотографии.'
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
                            {images.map((image) => {
                                const isSelected = selectedImageIds.has(image.id);
                                const isDisabled = !isSelected && activeSlotIsFull;

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
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                                />
                                                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
                                                    {isSelected && (
                                                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-orange-500/20">
                                                            Выбрано
                                                        </span>
                                                    )}
                                                    <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                                                        <Expand className="h-3.5 w-3.5" />
                                                        Открыть
                                                    </span>
                                                </div>
                                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                                            </button>
                                        </div>

                                        <div className="p-3">
                                            <Button
                                                type="button"
                                                disabled={!activeSlot || isDisabled || isSubmitted}
                                                className={cn(
                                                    'h-11 w-full rounded-full',
                                                    isSelected
                                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                        : 'bg-white/5 text-white hover:bg-white/10',
                                                )}
                                                onClick={() => handleToggleSelection(image.id)}
                                            >
                                                <Heart
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        isSelected && 'fill-current',
                                                    )}
                                                />
                                                {isSelected ? 'Выбрано' : 'Поставить лайк'}
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
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
                    className="max-h-[94vh] max-w-[min(96vw,1500px)] gap-4 overflow-hidden border border-white/10 bg-[#050505] p-4 text-white sm:p-5"
                >
                    {activeImage && (
                        <>
                            <div className="flex items-start justify-between gap-4 pr-10">
                                <div className="space-y-1">
                                    <DialogTitle className="text-base text-white sm:text-lg">
                                        Просмотр фотографии
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Кадр {activeImageIndex + 1} из {images.length}. Откройте фото крупно и затем поставьте лайк, если хотите выбрать его.
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/8 bg-black">
                                <img
                                    src={activeImage.url}
                                    alt={activeImage.name}
                                    className="max-h-[76vh] w-full object-contain"
                                />

                                {activeImageIndex > 0 && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="absolute left-4 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/10 bg-black/60 text-white hover:bg-black/80"
                                        onClick={() => setActiveImageId(images[activeImageIndex - 1].id)}
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                        <span className="sr-only">Предыдущее фото</span>
                                    </Button>
                                )}

                                {activeImageIndex < images.length - 1 && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="absolute right-4 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/10 bg-black/60 text-white hover:bg-black/80"
                                        onClick={() => setActiveImageId(images[activeImageIndex + 1].id)}
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                        <span className="sr-only">Следующее фото</span>
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-zinc-400">
                                    {activeSlot ? (
                                        <>
                                            Активный блок:{' '}
                                            <span className="font-medium text-white">
                                                {activeSlot.name}
                                            </span>
                                        </>
                                    ) : (
                                        'Сначала выберите блок.'
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    disabled={!activeSlot || (!selectedImageIds.has(activeImage.id) && activeSlotIsFull) || isSubmitted}
                                    className={cn(
                                        'h-11 rounded-full px-5',
                                        selectedImageIds.has(activeImage.id)
                                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                                            : 'bg-white/5 text-white hover:bg-white/10',
                                    )}
                                    onClick={() => handleToggleSelection(activeImage.id)}
                                >
                                    <Heart
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            selectedImageIds.has(activeImage.id) && 'fill-current',
                                        )}
                                    />
                                    {selectedImageIds.has(activeImage.id) ? 'Выбрано' : 'Поставить лайк'}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function formatSlotCount(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'блок заполнен';
    }

    if ([2, 3, 4].includes(count % 10) && ! [12, 13, 14].includes(count % 100)) {
        return 'блока заполнены';
    }

    return 'блоков заполнено';
}

function formatPhotoCount(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'фото';
    }

    if ([2, 3, 4].includes(count % 10) && ! [12, 13, 14].includes(count % 100)) {
        return 'фото';
    }

    return 'фото';
}
