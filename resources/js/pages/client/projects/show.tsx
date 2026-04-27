import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Eye, Heart, ImageIcon, Quote, Send, UserRound } from 'lucide-react';
import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    submitSelection,
    toggleImageSelection,
} from '@/actions/App/Http/Controllers/ProjectClientSelectionController';
import AppToaster from '@/components/app-toaster';
import InputError from '@/components/input-error';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/hooks/use-translations';
import {
    getClientSelectionDeadlineState,
    isClientSelectionDeadlineExpired,
} from '@/lib/client-selection-deadline';
import { cn } from '@/lib/utils';

type ImageItem = {
    id: number;
    name: string;
    url: string;
    previewUrl: string | null;
    mimeType: string | null;
    sizeBytes: number;
    isTaken: boolean;
    isReserved: boolean;
    isSelected: boolean;
};

type Props = {
    project: {
        id: number;
        name: string;
        className: string;
        token: string;
        portraitCount: number;
        studentCount: number;
        submittedStudentsCount: number;
        remainingStudentsCount: number;
        clientSelectionDeadlineAt: string | null;
        clientSelectionCompletedAt: string | null;
    };
    selection: {
        selectedImageIds: number[];
    };
    images: ImageItem[];
};

type ClientSelectionForm = {
    first_name: string;
    last_name: string;
    student_quote: string;
    selected_image_ids: number[];
};

type ScreenStep = 'details' | 'photos';

export default function ClientProjectShow({
    project,
    selection,
    images,
}: Props) {
    const { t } = useTranslations();
    const page = usePage<{ errors?: Record<string, string> }>();
    const [step, setStep] = useState<ScreenStep>(
        selection.selectedImageIds.length > 0 ? 'photos' : 'details',
    );
    const [isSelectionSyncing, setIsSelectionSyncing] = useState(false);
    const [previewImageId, setPreviewImageId] = useState<number | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const form = useForm<ClientSelectionForm>({
        first_name: '',
        last_name: '',
        student_quote: '',
        selected_image_ids: selection.selectedImageIds,
    });

    const selectedIds = new Set(form.data.selected_image_ids);
    const imageMap = useMemo(
        () => new Map(images.map((image) => [image.id, image])),
        [images],
    );
    const selectedCount = form.data.selected_image_ids.length;
    const isLimitReached = project.remainingStudentsCount <= 0;
    const isDeadlineExpired =
        !isLimitReached &&
        isClientSelectionDeadlineExpired(project.clientSelectionDeadlineAt);
    const isClosed = isLimitReached || isDeadlineExpired;
    const canSubmit =
        !isClosed && selectedCount === project.portraitCount && images.length > 0;
    const selectedImagesError =
        form.errors.selected_image_ids ?? page.props.errors?.selected_image_ids;
    const submissionError = page.props.errors?.submission;
    const deadlineState = getClientSelectionDeadlineState(
        project.clientSelectionDeadlineAt,
        project.clientSelectionCompletedAt,
        nowMs,
    );
    const previewImage =
        previewImageId !== null ? imageMap.get(previewImageId) ?? null : null;

    useEffect(() => {
        if (sameIds(form.data.selected_image_ids, selection.selectedImageIds)) {
            return;
        }

        form.setData('selected_image_ids', selection.selectedImageIds);
    }, [form, form.data.selected_image_ids, selection.selectedImageIds]);

    useToastMessage(selectedImagesError, 'error');
    useToastMessage(submissionError, 'error');

    useEffect(() => {
        if (step !== 'photos' || !project.clientSelectionDeadlineAt) {
            return;
        }

        const intervalId = window.setInterval(() => {
            startTransition(() => {
                setNowMs(Date.now());
            });
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [project.clientSelectionDeadlineAt, step]);

    const syncAvailability = useEffectEvent(() => {
        if (document.visibilityState !== 'visible' || isClosed || isSelectionSyncing) {
            return;
        }

        router.reload({
            only: ['project', 'selection', 'images'],
        });
    });

    useEffect(() => {
        if (step !== 'photos' || isClosed) {
            return;
        }

        const intervalId = window.setInterval(() => {
            syncAvailability();
        }, 4000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isClosed, isSelectionSyncing, step]);

    const openPhotoSelection = () => {
        let hasError = false;

        if (form.data.last_name.trim().length === 0) {
            form.setError('last_name', t('client_selection.error.last_name'));
            hasError = true;
        }

        if (form.data.first_name.trim().length === 0) {
            form.setError('first_name', t('client_selection.error.first_name'));
            hasError = true;
        }

        if (form.data.student_quote.trim().length === 0) {
            form.setError('student_quote', t('client_selection.error.quote'));
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setStep('photos');
    };

    const toggleImage = (image: ImageItem) => {
        if (
            isClosed ||
            isSelectionSyncing ||
            image.isTaken ||
            image.isReserved
        ) {
            return;
        }

        const nextSelectedImageIds = selectedIds.has(image.id)
            ? form.data.selected_image_ids.filter(
                  (selectedImageId) => selectedImageId !== image.id,
              )
            : [...form.data.selected_image_ids, image.id];

        if (!selectedIds.has(image.id) && selectedCount >= project.portraitCount) {
            form.setError(
                'selected_image_ids',
                t('client_selection.error.only_n_portraits')
                    .replace(':count', String(project.portraitCount))
                    .replace(':word', formatPortraitWord(project.portraitCount, t)),
            );

            return;
        }

        form.setData('selected_image_ids', nextSelectedImageIds);
        form.clearErrors('selected_image_ids');
        setIsSelectionSyncing(true);

        router.post(
            toggleImageSelection.url(project.token),
            { image_id: image.id },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setIsSelectionSyncing(false);
                },
            },
        );
    };

    const submitForm = () => {
        if (isClosed) {
            return;
        }

        if (selectedCount !== project.portraitCount) {
            form.setError(
                'selected_image_ids',
                t('client_selection.error.exact_n_portraits')
                    .replace(':count', String(project.portraitCount))
                    .replace(':word', formatPortraitWord(project.portraitCount, t)),
            );

            return;
        }

        form.transform((data) => ({
            ...data,
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            student_quote: data.student_quote.trim(),
        }));

        form.post(submitSelection.url(project.token), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`${t('client_selection.meta_title')} | ${project.name}`} />
            <AppToaster />

            <div className="relative min-h-screen bg-[#08101d] px-4 py-5 text-white md:px-6 md:py-6">
                <div className="absolute top-4 right-4 z-20 md:top-6 md:right-6">
                    <LanguageSwitcher />
                </div>
                <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center justify-center">
                    {step === 'details' ? (
                        <section className="w-full max-w-2xl rounded-[2rem] border border-white/8 bg-white/[0.04] p-6 shadow-[0_30px_100px_rgba(2,6,23,0.45)] backdrop-blur-xl md:p-8">
                            <div className="space-y-5">
                                <FieldBlock
                                    icon={UserRound}
                                    value={form.data.last_name}
                                    placeholder={t('client_selection.placeholder.last_name')}
                                    error={form.errors.last_name}
                                    disabled={isClosed || form.processing}
                                    onChange={(value) => {
                                        form.setData('last_name', value);
                                        form.clearErrors('last_name');
                                    }}
                                />

                                <FieldBlock
                                    icon={UserRound}
                                    value={form.data.first_name}
                                    placeholder={t('client_selection.placeholder.first_name')}
                                    error={form.errors.first_name}
                                    disabled={isClosed || form.processing}
                                    onChange={(value) => {
                                        form.setData('first_name', value);
                                        form.clearErrors('first_name');
                                    }}
                                />

                                <QuoteBlock
                                    value={form.data.student_quote}
                                    placeholder={t('client_selection.placeholder.quote')}
                                    error={form.errors.student_quote}
                                    disabled={isClosed || form.processing}
                                    onChange={(value) => {
                                        form.setData('student_quote', value);
                                        form.clearErrors('student_quote');
                                    }}
                                />

                                <Button
                                    type="button"
                                    disabled={isClosed || form.processing}
                                    onClick={openPhotoSelection}
                                    className="h-13 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/10 disabled:text-slate-500"
                                >
                                    {t('client_selection.button.choose_photos')}
                                </Button>
                            </div>
                        </section>
                    ) : (
                        <section className="w-full space-y-5">
                            <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.04] p-3.5 backdrop-blur-xl md:rounded-[1.6rem] md:p-4 md:px-5">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={form.processing}
                                    onClick={() => setStep('details')}
                                    className="h-9 self-start rounded-full px-3 text-slate-300 hover:bg-white/8 hover:text-white"
                                >
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    {t('client_selection.button.back')}
                                </Button>

                                <h1 className="px-1 text-left text-xl font-medium tracking-tight text-white sm:text-2xl md:px-0 md:text-center md:text-xl">
                                    {project.name}
                                </h1>

                                <div className="grid w-full grid-cols-[max-content_minmax(0,1fr)] items-center gap-2.5 md:flex md:w-auto md:self-auto">
                                    <TimerBadge
                                        value={formatTimerLabel(deadlineState, t)}
                                        isExpired={deadlineState?.state === 'expired'}
                                    />

                                    <Button
                                        type="button"
                                        disabled={form.processing || !canSubmit}
                                        onClick={submitForm}
                                        className="h-11 w-full rounded-full bg-emerald-500 px-5 text-white hover:bg-emerald-400 disabled:bg-white/10 disabled:text-slate-500 md:w-auto"
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {form.processing
                                            ? t('client_selection.button.submitting')
                                            : t('client_selection.button.submit')}
                                    </Button>
                                </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-4">
                                {Array.from({ length: project.portraitCount }).map(
                                    (_, index) => {
                                        const imageId = form.data.selected_image_ids[index];
                                        const image = imageId
                                            ? imageMap.get(imageId) ?? null
                                            : null;

                                        return (
                                            <SelectionSlot
                                                key={`slot-${index + 1}`}
                                                index={index + 1}
                                                label={t('client_selection.slot.portrait').replace(':index', String(index + 1))}
                                                previewAriaLabel={t('client_selection.preview.open_aria')}
                                                image={image}
                                                onPreview={(previewId) =>
                                                    setPreviewImageId(previewId)
                                                }
                                            />
                                        );
                                    },
                                )}
                            </div>

                            {images.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                                    {images.map((image) => {
                                        const isSelected = selectedIds.has(image.id);
                                        const isDisabled =
                                            isClosed ||
                                            isSelectionSyncing ||
                                            image.isTaken ||
                                            image.isReserved;

                                        return (
                                            <div
                                                key={image.id}
                                                role="button"
                                                tabIndex={isDisabled ? -1 : 0}
                                                aria-disabled={isDisabled}
                                                onClick={() => {
                                                    if (!isDisabled) {
                                                        toggleImage(image);
                                                    }
                                                }}
                                                onKeyDown={(event) => {
                                                    if (isDisabled) {
                                                        return;
                                                    }

                                                    if (
                                                        event.key === 'Enter' ||
                                                        event.key === ' '
                                                    ) {
                                                        event.preventDefault();
                                                        toggleImage(image);
                                                    }
                                                }}
                                                className={cn(
                                                    'group relative overflow-hidden rounded-[1.4rem] border transition duration-300',
                                                    isSelected
                                                        ? 'border-rose-400/60 shadow-[0_18px_55px_rgba(244,63,94,0.28)]'
                                                        : 'border-white/8 hover:-translate-y-0.5 hover:border-white/20',
                                                    isDisabled &&
                                                        !isSelected &&
                                                        'cursor-not-allowed opacity-50',
                                                    !isDisabled &&
                                                        'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                                                )}
                                            >
                                                <div className="relative aspect-[4/5] bg-black/30">
                                                    {image.previewUrl || image.url ? (
                                                        <img
                                                            src={image.previewUrl ?? image.url}
                                                            alt={image.name}
                                                            className={cn(
                                                                'h-full w-full object-cover transition duration-500',
                                                                isSelected
                                                                    ? 'scale-[1.05]'
                                                                    : 'group-hover:scale-[1.03]',
                                                            )}
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                                                            <ImageIcon className="h-8 w-8" />
                                                        </div>
                                                    )}

                                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            setPreviewImageId(image.id);
                                                        }}
                                                        className="absolute top-2 left-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
                                                        aria-label={t('client_selection.preview.open_aria').replace(':name', image.name)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>

                                                    <span
                                                        className={cn(
                                                            'absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-300',
                                                            isSelected
                                                                ? 'border-rose-300/30 bg-rose-500 text-white'
                                                                : 'border-white/15 bg-black/35 text-white backdrop-blur-sm',
                                                        )}
                                                    >
                                                        <Heart
                                                            className={cn(
                                                                'h-4 w-4',
                                                                isSelected && 'fill-current',
                                                            )}
                                                        />
                                                    </span>

                                                    {image.isReserved && !isSelected && (
                                                        <PhotoBadge>{t('client_selection.badge.reserved')}</PhotoBadge>
                                                    )}

                                                    {image.isTaken && !isSelected && (
                                                        <PhotoBadge tone="success">
                                                            {t('client_selection.badge.taken')}
                                                        </PhotoBadge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-[1.8rem] border border-dashed border-white/10 px-5 py-16 text-center text-sm text-slate-500">
                                    {t('client_selection.empty')}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>

            <Dialog
                open={previewImage !== null}
                onOpenChange={(open) => !open && setPreviewImageId(null)}
            >
                <DialogContent
                    className="max-w-[calc(100vw-1.5rem)] border-white/10 bg-slate-950/95 p-3 text-white sm:max-w-4xl"
                    showCloseButton
                >
                    {previewImage && (
                        <div className="space-y-3">
                            <div className="px-1">
                                <DialogTitle className="truncate text-sm text-white sm:text-base">
                                    {previewImage.name}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400">
                                    {t('client_selection.preview.description')}
                                </DialogDescription>
                            </div>

                            <div className="overflow-hidden rounded-[1.4rem] bg-black">
                                <img
                                    src={previewImage.previewUrl ?? previewImage.url}
                                    alt={previewImage.name}
                                    className="max-h-[75vh] w-full object-contain"
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function FieldBlock({
    icon: Icon,
    value,
    placeholder,
    error,
    disabled,
    onChange,
}: {
    icon: typeof UserRound;
    value: string;
    placeholder: string;
    error?: string;
    disabled: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="relative">
                <Icon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    className="h-14 rounded-[1.2rem] border border-white/10 bg-slate-950/60 pr-4 pl-11 text-base text-white placeholder:text-slate-500"
                />
            </div>
            <InputError message={error} className="text-rose-200" />
        </div>
    );
}

function QuoteBlock({
    value,
    placeholder,
    error,
    disabled,
    onChange,
}: {
    value: string;
    placeholder: string;
    error?: string;
    disabled: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="relative">
                <Quote className="pointer-events-none absolute top-4 left-4 h-4 w-4 text-slate-500" />
                <textarea
                    rows={5}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    className="min-h-40 w-full resize-none rounded-[1.4rem] border border-white/10 bg-slate-950/60 px-11 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-white/20 focus:ring-2 focus:ring-white/10"
                />
            </div>
            <InputError message={error} className="text-rose-200" />
        </div>
    );
}

function TimerBadge({
    value,
    isExpired,
}: {
    value: string;
    isExpired: boolean;
}) {
    return (
        <div
            className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium tabular-nums',
                isExpired
                    ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                    : 'border-white/10 bg-slate-950/60 text-white',
            )}
        >
            {value}
        </div>
    );
}

function SelectionSlot({
    index,
    label,
    previewAriaLabel,
    image,
    onPreview,
}: {
    index: number;
    label: string;
    previewAriaLabel: string;
    image: ImageItem | null;
    onPreview: (imageId: number) => void;
}) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-[1.5rem] border bg-slate-950/55',
                image ? 'border-white/12' : 'border-dashed border-white/10',
            )}
        >
            {image ? (
                <div className="relative aspect-[4/5]">
                    <img
                        src={image.previewUrl ?? image.url}
                        alt={image.name}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <button
                        type="button"
                        onClick={() => onPreview(image.id)}
                        className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
                        aria-label={previewAriaLabel.replace(':name', image.name)}
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <div className="absolute top-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur-sm">
                        {index}
                    </div>
                </div>
            ) : (
                <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 text-slate-500">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/10">
                        <ImageIcon className="h-5 w-5" />
                    </div>
                    <span className="text-sm">{label}</span>
                </div>
            )}
        </div>
    );
}

function PhotoBadge({
    tone = 'default',
    children,
}: {
    tone?: 'default' | 'success';
    children: string;
}) {
    return (
        <span
            className={cn(
                'absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm',
                tone === 'success'
                    ? 'bg-emerald-500/80 text-white'
                    : 'bg-black/45 text-white',
            )}
        >
            {children}
        </span>
    );
}

function formatTimerLabel(
    deadlineState: ReturnType<typeof getClientSelectionDeadlineState>,
    t: (key: string, fallback?: string) => string,
): string {
    if (!deadlineState) {
        return t('client_selection.timer.none');
    }

    if (deadlineState.state === 'active' && deadlineState.remaining) {
        return deadlineState.remaining;
    }

    if (deadlineState.state === 'submitted') {
        return t('client_selection.timer.submitted');
    }

    if (deadlineState.state === 'expired') {
        return t('client_selection.timer.expired');
    }

    return deadlineState.label;
}

function sameIds(currentIds: number[], nextIds: number[]): boolean {
    if (currentIds.length !== nextIds.length) {
        return false;
    }

    return currentIds.every((imageId, index) => imageId === nextIds[index]);
}

function useToastMessage(
    message: string | null | undefined,
    level: 'error' | 'success' | 'info' | 'warning' = 'info',
) {
    const lastMessageRef = useRef<string | null>(null);

    useEffect(() => {
        if (!message || message === lastMessageRef.current) {
            return;
        }

        lastMessageRef.current = message;

        switch (level) {
            case 'error':
                toast.error(message);
                break;
            case 'success':
                toast.success(message);
                break;
            case 'warning':
                toast.warning(message);
                break;
            default:
                toast.info(message);
                break;
        }
    }, [level, message]);
}

function formatPortraitWord(
    count: number,
    t: (key: string, fallback?: string) => string,
): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return t('client_selection.portraits_word.one');
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return t('client_selection.portraits_word.few');
    }

    return t('client_selection.portraits_word.many');
}
