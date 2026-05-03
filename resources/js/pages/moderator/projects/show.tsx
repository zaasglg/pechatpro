import { Head, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Copy,
    Download,
    ImageIcon,
    Link2,
    Printer,
    Send,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    approve as approveModeration,
    assignDesigner,
    completePrinting,
    publishClientReview,
    sendBackToMontage,
} from '@/actions/App/Http/Controllers/Admin/ModerationReviewController';
import {
    approveSelection,
    destroy,
    index as moderatorProjectIndex,
    publishSelection,
    show as moderatorProjectShow,
    showPhotographer,
} from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { moderatorDownload as downloadModeratorWork } from '@/actions/App/Http/Controllers/ProjectMontageDownloadController';
import ClientSelectionDeadlinePanel from '@/components/client-selection-deadline-panel';
import InputError from '@/components/input-error';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClipboard } from '@/hooks/use-clipboard';
import { useProgressiveList } from '@/hooks/use-progressive-list';
import {
    currentDateTimeLocalValue,
    toDateTimeLocalValue,
} from '@/lib/client-selection-deadline';

type Submission = {
    id: number;
    studentName: string;
    studentQuote: string;
    submittedAt: string | null;
    selectedImagesCount: number;
    selectedImages: Array<{
        id: number;
        name: string;
        url: string;
        previewUrl: string | null;
    }>;
};

type SourceImage = {
    id: number;
    name: string;
    url: string;
    previewUrl: string | null;
    sizeBytes: number;
    mimeType: string | null;
    downloadUrl: string;
    uploadedAt: string | null;
};

type Props = {
    project: {
        id: number;
        name: string;
        photographerId: number | null;
        className: string;
        albumType: string;
        albumSize: string;
        coverType: string;
        photographerName: string | null;
        photographerPhone: string | null;
        sourceImagesCount: number;
        designFilesCount: number;
        currentStageName: string | null;
        currentStageSlug: string | null;
        clientSelectionLink: string | null;
        clientSelectionPublishedAt: string | null;
        clientSelectionDeadlineAt: string | null;
        clientSelectionSubmittedAt: string | null;
        clientSelectionResponsesCount: number;
        clientSelectionRemainingCount: number;
        clientSelectionLimitReached: boolean;
        montageReviewLink: string | null;
        montageReviewPublishedAt: string | null;
        montageReviewSubmittedAt: string | null;
        canApproveModeration: boolean;
        canCompletePrinting: boolean;
        isCompleted: boolean;
        printingReadyAt: string | null;
        selectedMontageUserId: number | null;
        selectedMontageUserName: string | null;
        selectedDesignerUserId: number | null;
        selectedDesignerUserName: string | null;
        selectedPrintUserId: number | null;
        selectedPrintUserName: string | null;
        unitPrice: string | null;
        totalPrice: string | null;
        printQuantity: number;
        portraitCount: number;
        studentCount: number;
        downloads: {
            projectArchiveUrl: string;
            sourceImagesArchiveUrl: string;
            readyWorksArchiveUrl: string;
        };
    };
    sourceImages: SourceImage[];
    submissions: Submission[];
    montageAssets: Array<{
        id: number;
        name: string;
        url: string;
        previewUrl: string | null;
        mimeType: string | null;
        requestedForRevision: boolean;
    }>;
    montageReview: {
        requestedAssets: Array<{
            id: number;
            name: string;
            comment: string | null;
        }>;
    };
    montageUsers: Array<{
        id: number;
        name: string;
    }>;
    designerUsers: Array<{
        id: number;
        name: string;
    }>;
    printUsers: Array<{
        id: number;
        name: string;
    }>;
    status?: string | null;
};

export default function ModeratorProjectShow({
    project,
    sourceImages,
    submissions,
    montageAssets,
    montageReview,
    montageUsers,
    designerUsers,
    printUsers,
    status,
}: Props) {
    const page = usePage<{ errors?: Record<string, string> }>();
    const [copiedText, copy] = useClipboard();
    const [activeMontageAssetId, setActiveMontageAssetId] = useState<
        number | null
    >(null);
    const [previewImage, setPreviewImage] = useState<{
        name: string;
        url: string;
    } | null>(null);
    const [sourcePreview, setSourcePreview] = useState<SourceImage | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const {
        hasMore: hasMoreSourceImages,
        sentinelRef: sourceImagesSentinelRef,
        visibleItems: visibleSourceImages,
    } = useProgressiveList(sourceImages, {
        initialCount: 48,
        incrementBy: 48,
    });
    const deleteForm = useForm<Record<string, never>>({});
    const form = useForm<{
        selection_deadline_at: string;
    }>({
        selection_deadline_at: toDateTimeLocalValue(
            project.clientSelectionDeadlineAt,
        ),
    });
    const approveForm = useForm<{
        montage_user_id: string;
    }>({
        montage_user_id: project.selectedMontageUserId
            ? String(project.selectedMontageUserId)
            : String(montageUsers[0]?.id ?? ''),
    });
    const canApproveSelection =
        project.clientSelectionResponsesCount > 0 &&
        project.currentStageSlug === 'client-photo-selection' &&
        montageUsers.length > 0;
    const clientSelectionProgressPercent =
        project.studentCount > 0
            ? Math.min(
                  100,
                  Math.round(
                      (project.clientSelectionResponsesCount /
                          project.studentCount) *
                          100,
                  ),
              )
            : 0;
    const designerForm = useForm<{
        designer_user_id: string;
    }>({
        designer_user_id: project.selectedDesignerUserId
            ? String(project.selectedDesignerUserId)
            : String(designerUsers[0]?.id ?? ''),
    });
    const moderationForm = useForm<{
        print_user_id: string;
    }>({
        print_user_id: project.selectedPrintUserId
            ? String(project.selectedPrintUserId)
            : String(printUsers[0]?.id ?? ''),
    });
    const publishReviewForm = useForm<Record<string, never>>({});
    const returnToMontageForm = useForm<Record<string, never>>({});
    const completePrintingForm = useForm<Record<string, never>>({});
    const canApproveModeration = project.canApproveModeration;
    const canCompletePrinting = project.canCompletePrinting;
    const canAssignDesigner =
        project.currentStageSlug === 'moderation' &&
        montageAssets.length > 0 &&
        project.selectedDesignerUserId === null &&
        project.montageReviewPublishedAt === null &&
        designerUsers.length > 0;
    const canPublishMontageReview =
        project.currentStageSlug === 'moderation' &&
        montageAssets.length > 0 &&
        project.selectedDesignerUserId !== null;
    const canSendBackToMontage =
        project.currentStageSlug === 'moderation' &&
        project.montageReviewSubmittedAt !== null &&
        montageReview.requestedAssets.length > 0;
    const revisionCommentsByAssetId = useMemo(
        () =>
            new Map(
                montageReview.requestedAssets.map((asset) => [
                    asset.id,
                    asset.comment,
                ]),
            ),
        [montageReview.requestedAssets],
    );
    const activeMontageAsset =
        activeMontageAssetId === null
            ? null
            : (montageAssets.find(
                  (asset) => asset.id === activeMontageAssetId,
              ) ?? null);
    const activeMontageAssetComment =
        activeMontageAsset === null
            ? null
            : (revisionCommentsByAssetId.get(activeMontageAsset.id) ?? null);
    const clientConfirmedMontageReview =
        project.montageReviewSubmittedAt !== null &&
        montageReview.requestedAssets.length === 0;
    const workflowCurrentStep = resolveModeratorWorkflowStep({
        isCompleted: project.isCompleted,
        currentStageSlug: project.currentStageSlug,
        selectedDesignerUserId: project.selectedDesignerUserId,
        clientSelectionPublishedAt: project.clientSelectionPublishedAt,
        canApproveSelection,
        canAssignDesigner,
        canPublishMontageReview,
        canSendBackToMontage,
        canApproveModeration,
        canCompletePrinting,
    });
    const workflowSteps = buildModeratorWorkflowSteps(
        workflowCurrentStep,
        project.isCompleted,
    );
    const [manualStepKey, setManualStepKey] = useState<
        ModeratorWorkflowStep['key'] | null
    >(null);
    const activeStepKey = manualStepKey ?? workflowCurrentStep;
    const canDownloadReadyWorksArchive = montageAssets.length > 0;
    const canDownloadSourceImagesArchive = sourceImages.length > 0;
    const canDownloadProjectArchive =
        sourceImages.length > 0 ||
        montageAssets.length > 0 ||
        project.designFilesCount > 0;

    const montageAssetsGallery =
        montageAssets.length > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                {montageAssets.map((asset) => (
                    <button
                        key={asset.id}
                        type="button"
                        title={asset.name}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-white/6 bg-slate-900/45 transition hover:border-emerald-500/40"
                        onClick={() => setActiveMontageAssetId(asset.id)}
                    >
                        {asset.previewUrl ? (
                            <img
                                src={asset.previewUrl}
                                alt={asset.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase">
                                    {(asset.name.split('.').pop() ?? '').toUpperCase() || 'FILE'}
                                </span>
                            </div>
                        )}
                        {asset.requestedForRevision && (
                            <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg shadow-emerald-500/20">
                                Правка
                            </span>
                        )}
                    </button>
                ))}
            </div>
        ) : null;

    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Выбор клиента',
                href: moderatorProjectIndex(),
            },
            {
                title: project.photographerName ?? 'Фотограф',
                href: project.photographerId
                    ? showPhotographer(project.photographerId)
                    : moderatorProjectIndex(),
            },
            {
                title: project.name,
                href: moderatorProjectShow(project.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Модерация | ${project.name}`} />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <div className="space-y-5">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                >
                                    {project.className}
                                </Badge>
                                {project.currentStageName && (
                                    <Badge
                                        variant="outline"
                                        className="border-white/10 bg-white/5 text-zinc-200"
                                    >
                                        {project.currentStageName}
                                    </Badge>
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-rose-500/30 bg-rose-500/10 text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/20 hover:text-rose-300"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Удалить проект
                            </Button>
                        </div>

                        <div>
                            <h1 className="text-3xl font-semibold text-white">
                                {project.name}
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                                Выдайте одну ссылку для всего класса, следите
                                за анкетами учеников и после первых ответов
                                передавайте проект на монтаж. После монтажа
                                проект сначала уходит дизайнеру на виньетки, и
                                только потом модератор отправляет готовый
                                результат клиенту.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-6">
                    {workflowSteps.map((step, index) => {
                        const isActive = activeStepKey === step.key;

                        return (
                            <button
                                key={step.key}
                                type="button"
                                onClick={() => setManualStepKey(step.key)}
                                className={`rounded-[1.5rem] border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                                    isActive
                                        ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                                        : step.status === 'current'
                                          ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                                          : step.status === 'completed'
                                            ? 'border-white/8 bg-slate-900/45 hover:border-white/20'
                                            : 'border-white/6 bg-slate-950/35 hover:border-white/15'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                                            step.status === 'current' ||
                                            isActive
                                                ? 'bg-emerald-500 text-white'
                                                : step.status === 'completed'
                                                  ? 'bg-white/10 text-white'
                                                  : 'bg-white/5 text-zinc-400'
                                        }`}
                                    >
                                        {step.status === 'completed' &&
                                        !isActive ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {step.title}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-400">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                {page.props.errors?.project && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {page.props.errors.project}
                    </div>
                )}

                {page.props.errors?.montage_user_id && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {page.props.errors.montage_user_id}
                    </div>
                )}

                {page.props.errors?.designer_user_id && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {page.props.errors.designer_user_id}
                    </div>
                )}

                {page.props.errors?.print_user_id && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {page.props.errors.print_user_id}
                    </div>
                )}

                <section className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                    <div className="mb-5">
                        <h2 className="text-xl font-semibold text-white">
                            Информация о проекте
                        </h2>
                        <p className="mt-2 text-sm text-zinc-400">
                            Цена, скачивание проекта и доступ к исходникам в
                            одном месте.
                        </p>
                    </div>

                    <Tabs defaultValue="price" className="space-y-4">
                        <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/50 p-1">
                            <TabsTrigger
                                value="price"
                                className="rounded-xl px-4 py-2 text-sm"
                            >
                                Цена
                            </TabsTrigger>
                            <TabsTrigger
                                value="downloads"
                                className="rounded-xl px-4 py-2 text-sm"
                            >
                                Скачать проект
                            </TabsTrigger>
                            <TabsTrigger
                                value="source-images"
                                className="rounded-xl px-4 py-2 text-sm"
                            >
                                Исходники
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="price" className="mt-0">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                                        Цена за экземпляр
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-white">
                                        {formatMoney(project.unitPrice)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                                        Общая стоимость
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-white">
                                        {formatMoney(project.totalPrice)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                                        Тираж
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-white">
                                        {project.printQuantity}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                                        Портреток
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-white">
                                        {project.portraitCount}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                                        Учеников
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-white">
                                        {project.studentCount}
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="downloads" className="mt-0">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-sm font-semibold text-white">
                                        Полный архив проекта
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        Исходники, готовые работы и
                                        дизайн-файлы.
                                    </p>
                                    {canDownloadProjectArchive ? (
                                        <Button
                                            asChild
                                            type="button"
                                            className="mt-4 w-full bg-emerald-500 text-white hover:bg-emerald-600"
                                        >
                                            <a
                                                href={
                                                    project.downloads
                                                        .projectArchiveUrl
                                                }
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Скачать архив
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            disabled
                                            className="mt-4 w-full"
                                        >
                                            Пока нечего скачивать
                                        </Button>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-sm font-semibold text-white">
                                        Архив исходников
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        Все исходные фото одним ZIP-файлом.
                                    </p>
                                    {canDownloadSourceImagesArchive ? (
                                        <Button
                                            asChild
                                            type="button"
                                            variant="outline"
                                            className="mt-4 w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                                        >
                                            <a
                                                href={
                                                    project.downloads
                                                        .sourceImagesArchiveUrl
                                                }
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Скачать исходники
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            disabled
                                            className="mt-4 w-full"
                                            variant="outline"
                                        >
                                            Нет исходников
                                        </Button>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                                    <p className="text-sm font-semibold text-white">
                                        Архив готовых работ
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        Все финальные файлы после монтажа.
                                    </p>
                                    {canDownloadReadyWorksArchive ? (
                                        <Button
                                            asChild
                                            type="button"
                                            variant="outline"
                                            className="mt-4 w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                                        >
                                            <a
                                                href={
                                                    project.downloads
                                                        .readyWorksArchiveUrl
                                                }
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Скачать готовые
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            disabled
                                            className="mt-4 w-full"
                                            variant="outline"
                                        >
                                            Нет готовых работ
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="source-images" className="mt-0">
                            {sourceImages.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                                    {visibleSourceImages.map((image) => (
                                        <button
                                            key={image.id}
                                            type="button"
                                            onClick={() => setSourcePreview(image)}
                                            className="group relative aspect-square overflow-hidden rounded-xl border border-white/8 bg-slate-950/45 transition hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                                            aria-label={image.name}
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
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                                                    <ImageIcon className="h-8 w-8" />
                                                </div>
                                            )}
                                            <span className="pointer-events-none absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                Открыть
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
                                    Исходники еще не загружены.
                                </div>
                            )}
                            {hasMoreSourceImages && (
                                <div
                                    ref={sourceImagesSentinelRef}
                                    className="h-10"
                                    aria-hidden="true"
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </section>

                <section className="space-y-6">
                    {activeStepKey === 'setup' && (
                        <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white">
                                    Шаг 1. Ссылка для учеников
                                </h2>
                                <p className="mt-2 text-sm text-zinc-400">
                                    Один адрес для всего класса. Каждый ученик
                                    открывает ссылку, заполняет своё имя,
                                    фамилию, цитату и выбирает только свои
                                    портретки.
                                </p>
                            </div>

                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    form.post(publishSelection.url(project.id));
                                }}
                            >
                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                                    <div className="rounded-[1.5rem] border border-white/6 bg-slate-950/45 p-5">
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            <SelectionMetric
                                                label="Портреток на ученика"
                                                value={String(
                                                    project.portraitCount,
                                                )}
                                                description="Каждый ученик выбирает ровно столько фотографий."
                                            />
                                            <SelectionMetric
                                                label="Лимит учеников"
                                                value={String(
                                                    project.studentCount,
                                                )}
                                                description="После этого количества ответов ссылка закроется."
                                            />
                                            <SelectionMetric
                                                label="Анкет получено"
                                                value={`${project.clientSelectionResponsesCount}/${project.studentCount}`}
                                                description={
                                                    project.clientSelectionRemainingCount > 0
                                                        ? `Осталось ${project.clientSelectionRemainingCount} ${formatStudentWord(project.clientSelectionRemainingCount)}`
                                                        : 'Лимит по ученикам уже заполнен'
                                                }
                                            />
                                        </div>

                                        <div className="mt-5">
                                            <div className="flex items-center justify-between gap-3 text-sm">
                                                <span className="text-zinc-400">
                                                    Прогресс заполнения
                                                </span>
                                                <span className="font-medium text-white">
                                                    {
                                                        project.clientSelectionResponsesCount
                                                    }
                                                    /{project.studentCount}
                                                </span>
                                            </div>
                                            <div className="mt-3 h-3 rounded-full bg-white/6">
                                                <div
                                                    className="h-3 rounded-full bg-emerald-500 transition-[width]"
                                                    style={{
                                                        width: `${clientSelectionProgressPercent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                                            <p className="text-sm font-semibold text-white">
                                                Как это работает
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                                                Ученики заходят по одной общей
                                                ссылке по очереди. Каждый ответ
                                                фиксирует имя, цитату и набор
                                                фотографий, а уже выбранные
                                                кадры автоматически становятся
                                                недоступны для остальных.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 rounded-[1.5rem] border border-white/6 bg-slate-950/45 p-5">
                                        <div className="grid gap-2">
                                            <Label className="text-zinc-300">
                                                Дедлайн выбора
                                            </Label>
                                            <Input
                                                type="datetime-local"
                                                min={currentDateTimeLocalValue()}
                                                value={form.data.selection_deadline_at}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'selection_deadline_at',
                                                        event.target.value,
                                                    )
                                                }
                                                className="border-white/10 bg-slate-950/60 text-white"
                                            />
                                            <InputError
                                                message={
                                                    form.errors
                                                        .selection_deadline_at
                                                }
                                            />
                                        </div>

                                        {project.clientSelectionLink ? (
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium text-white">
                                                    Публичная ссылка
                                                </p>
                                                <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-3 text-sm break-all text-zinc-300">
                                                    {project.clientSelectionLink}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                                                    onClick={() => {
                                                        if (
                                                            project.clientSelectionLink
                                                        ) {
                                                            copy(
                                                                project.clientSelectionLink,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {copiedText ===
                                                    project.clientSelectionLink ? (
                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    ) : (
                                                        <Copy className="mr-2 h-4 w-4" />
                                                    )}
                                                    {copiedText ===
                                                    project.clientSelectionLink
                                                        ? 'Скопировано'
                                                        : 'Копировать ссылку'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
                                                После первого сохранения здесь
                                                появится ссылка для учеников.
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={form.processing}
                                            className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                                        >
                                            {form.processing
                                                ? 'Сохранение...'
                                                : project.clientSelectionPublishedAt
                                                  ? 'Обновить дедлайн и ссылку'
                                                  : 'Сохранить и выдать ссылку'}
                                        </Button>
                                    </div>
                                </div>

                                <ClientSelectionDeadlinePanel
                                    deadlineAt={project.clientSelectionDeadlineAt}
                                    submittedAt={
                                        project.clientSelectionSubmittedAt
                                    }
                                />
                            </form>
                        </div>
                    )}

                    {activeStepKey === 'client' && (
                        <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-emerald-300" />
                                <h2 className="text-xl font-semibold text-white">
                                    Шаг 2. Выбор клиента
                                </h2>
                            </div>

                            <p className="mt-2 text-sm text-zinc-400">
                                Здесь видны анкеты учеников: имя, цитата и
                                выбранные портретки. Как только появится хотя
                                бы один ответ, проект можно передать на монтаж.
                            </p>

                            <div className="mt-5 rounded-2xl border border-white/6 bg-slate-950/45 p-4">
                                {canApproveSelection ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Клиент завершил выбор
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                Назначьте монтажёра и переведите
                                                проект на следующий этап.
                                            </p>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                            <div className="grid gap-2">
                                                <Label className="text-zinc-300">
                                                    Монтажёр
                                                </Label>
                                                <Select
                                                    value={
                                                        approveForm.data
                                                            .montage_user_id
                                                    }
                                                    onValueChange={(value) =>
                                                        approveForm.setData(
                                                            'montage_user_id',
                                                            value,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full border-white/10 bg-slate-950/45 text-white">
                                                        <SelectValue placeholder="Выберите монтажёра" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {montageUsers.map(
                                                            (user) => (
                                                                <SelectItem
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    value={String(
                                                                        user.id,
                                                                    )}
                                                                >
                                                                    {user.name}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                type="button"
                                                disabled={
                                                    approveForm.processing ||
                                                    approveForm.data
                                                        .montage_user_id === ''
                                                }
                                                className="bg-emerald-500 text-white hover:bg-emerald-600"
                                                onClick={() => {
                                                    approveForm.post(
                                                        approveSelection.url(
                                                            project.id,
                                                        ),
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    );
                                                }}
                                            >
                                                <Send className="mr-2 h-4 w-4" />
                                                Отправить на монтаж
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {project.clientSelectionResponsesCount >
                                            0
                                                ? project.currentStageSlug ===
                                                  'client-photo-selection'
                                                    ? 'Есть анкеты для проверки'
                                                    : 'Анкеты уже переданы дальше'
                                                : project.clientSelectionPublishedAt
                                                  ? 'Ожидаем первую анкету'
                                                  : 'Сначала выдайте ссылку ученикам'}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            {project.clientSelectionResponsesCount >
                                            0
                                                ? project.currentStageSlug ===
                                                  'client-photo-selection'
                                                    ? 'Для следующего шага нужен доступный монтажёр. Новые анкеты могут продолжать приходить до дедлайна или заполнения лимита.'
                                                    : 'Здесь остаются сохранённые анкеты учеников для истории проекта.'
                                                : project.clientSelectionPublishedAt
                                                  ? 'Как только любой ученик отправит анкету, здесь появится следующее действие для модератора.'
                                                  : 'Сохраните дедлайн выше, чтобы открыть ученикам этап выбора.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-5">
                                {submissions.length > 0 ? (
                                    <Accordion
                                        type="multiple"
                                        className="divide-y divide-white/6 rounded-2xl border border-white/6 bg-slate-950/45"
                                    >
                                        {submissions.map((submission) => (
                                            <AccordionItem
                                                key={submission.id}
                                                value={String(submission.id)}
                                                className="border-0 px-4"
                                            >
                                                <AccordionTrigger className="py-3 hover:no-underline">
                                                    <div className="flex flex-1 flex-wrap items-center gap-3">
                                                        <span className="font-medium text-white">
                                                            {
                                                                submission.studentName
                                                            }
                                                        </span>
                                                        <span className="text-xs text-zinc-400">
                                                            {
                                                                submission.selectedImagesCount
                                                            }{' '}
                                                            {formatImageWord(
                                                                submission.selectedImagesCount,
                                                            )}
                                                        </span>
                                                        {submission.studentQuote && (
                                                            <span className="truncate text-xs text-zinc-500">
                                                                · «
                                                                {
                                                                    submission.studentQuote
                                                                }
                                                                »
                                                            </span>
                                                        )}
                                                        <Badge
                                                            variant="outline"
                                                            className="ml-auto border-white/10 bg-white/5 text-xs font-normal text-zinc-300"
                                                        >
                                                            {formatDateTime(
                                                                submission.submittedAt,
                                                            )}
                                                        </Badge>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-4">
                                                    {submission.selectedImages
                                                        .length > 0 ? (
                                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                                                            {submission.selectedImages.map(
                                                                (image) => (
                                                                    <button
                                                                        key={
                                                                            image.id
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPreviewImage(
                                                                                {
                                                                                    name: image.name,
                                                                                    url:
                                                                                        image.url,
                                                                                },
                                                                            )
                                                                        }
                                                                        title={
                                                                            image.name
                                                                        }
                                                                        className="group relative aspect-square overflow-hidden rounded-lg border border-white/6 bg-black/40 transition hover:border-emerald-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                                                    >
                                                                        <img
                                                                            src={
                                                                                image.previewUrl ??
                                                                                image.url
                                                                            }
                                                                            alt={
                                                                                image.name
                                                                            }
                                                                            className="h-full w-full object-cover transition group-hover:scale-105"
                                                                            loading="lazy"
                                                                            decoding="async"
                                                                        />
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-xs text-zinc-500">
                                                            Ученик отправил
                                                            анкету без фото.
                                                        </div>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
                                        Пока ни один ученик не заполнил анкету.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeStepKey === 'montage' && (
                        <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <Printer className="h-4 w-4 text-emerald-300" />
                                <h2 className="text-xl font-semibold text-white">
                                    Шаг 3. Подготовка материалов
                                </h2>
                            </div>
                            <p className="mt-2 text-sm text-zinc-400">
                                Монтажёр собирает вёрстку альбома. Как только
                                он завершит этап, проект автоматически уйдёт
                                дизайнеру на виньетки.
                            </p>

                            <div className="mt-5 rounded-2xl border border-white/6 bg-slate-950/45 p-4">
                                <p className="text-sm font-semibold text-white">
                                    {project.selectedMontageUserName
                                        ? `Монтажёр: ${project.selectedMontageUserName}`
                                        : 'Монтажёр ещё не назначен'}
                                </p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    {montageAssets.length > 0
                                        ? `Загружено работ: ${montageAssets.length}. Ожидаем завершения этапа.`
                                        : 'Работы пока не загружены — ждём монтаж.'}
                                </p>
                            </div>

                            {montageAssetsGallery}
                        </div>
                    )}

                    {activeStepKey === 'design' && (
                        <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <Printer className="h-4 w-4 text-emerald-300" />
                                <h2 className="text-xl font-semibold text-white">
                                    Шаг 4. Виньетки и финальный макет
                                </h2>
                            </div>
                            <p className="mt-2 text-sm text-zinc-400">
                                Дизайнер добавляет виньетки и собирает финальный
                                макет. После его работы проект отправляется
                                клиенту на проверку.
                            </p>

                            <div className="mt-5 rounded-2xl border border-white/6 bg-slate-950/45 p-4">
                                {canAssignDesigner ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Монтаж завершён
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                Выберите дизайнера и передайте
                                                проект на виньетки.
                                            </p>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                            <div className="grid gap-2">
                                                <Label className="text-zinc-300">
                                                    Дизайнер
                                                </Label>
                                                <Select
                                                    value={
                                                        designerForm.data
                                                            .designer_user_id
                                                    }
                                                    onValueChange={(value) =>
                                                        designerForm.setData(
                                                            'designer_user_id',
                                                            value,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full border-white/10 bg-slate-950/45 text-white">
                                                        <SelectValue placeholder="Выберите дизайнера" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {designerUsers.map(
                                                            (user) => (
                                                                <SelectItem
                                                                    key={user.id}
                                                                    value={String(
                                                                        user.id,
                                                                    )}
                                                                >
                                                                    {user.name}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                type="button"
                                                disabled={
                                                    designerForm.processing ||
                                                    designerForm.data
                                                        .designer_user_id === ''
                                                }
                                                className="bg-emerald-500 text-white hover:bg-emerald-600"
                                                onClick={() => {
                                                    designerForm.post(
                                                        assignDesigner.url(
                                                            project.id,
                                                        ),
                                                        { preserveScroll: true },
                                                    );
                                                }}
                                            >
                                                <Send className="mr-2 h-4 w-4" />
                                                Передать дизайнеру
                                            </Button>
                                        </div>
                                    </div>
                                ) : project.selectedDesignerUserName ? (
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Дизайнер:{' '}
                                            {project.selectedDesignerUserName}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            Ожидаем завершения дизайна виньеток.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Ожидаем завершения монтажа
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            После монтажа здесь появится выбор
                                            дизайнера.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {montageAssetsGallery}
                        </div>
                    )}

                    {activeStepKey === 'review' && (
                        <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-emerald-300" />
                                <h2 className="text-xl font-semibold text-white">
                                    Шаг 5. Проверка клиентом
                                </h2>
                            </div>
                            <p className="mt-2 text-sm text-zinc-400">
                                Отправьте готовый макет клиенту, дождитесь
                                подтверждения или правок и реагируйте одной
                                кнопкой.
                            </p>

                            <div className="mt-5 rounded-2xl border border-white/6 bg-slate-950/45 p-4">
                                {canSendBackToMontage ? (
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Клиент прислал правки
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                Верните проект дизайнеру, чтобы
                                                доработать отмеченные файлы.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            disabled={
                                                returnToMontageForm.processing
                                            }
                                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                                            onClick={() => {
                                                returnToMontageForm.post(
                                                    sendBackToMontage.url(
                                                        project.id,
                                                    ),
                                                    { preserveScroll: true },
                                                );
                                            }}
                                        >
                                            <Send className="mr-2 h-4 w-4" />
                                            Вернуть дизайнеру
                                        </Button>
                                    </div>
                                ) : canPublishMontageReview ? (
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                {project.montageReviewPublishedAt
                                                    ? 'Ссылка уже у клиента'
                                                    : 'Дизайн готов к показу'}
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                {project.montageReviewPublishedAt
                                                    ? 'Можно перевыдать ссылку, если нужно.'
                                                    : 'Выдайте клиенту одну ссылку для проверки.'}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            disabled={
                                                publishReviewForm.processing
                                            }
                                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                                            onClick={() => {
                                                publishReviewForm.post(
                                                    publishClientReview.url(
                                                        project.id,
                                                    ),
                                                    { preserveScroll: true },
                                                );
                                            }}
                                        >
                                            <Send className="mr-2 h-4 w-4" />
                                            {project.montageReviewPublishedAt
                                                ? 'Обновить ссылку'
                                                : 'Выдать ссылку клиенту'}
                                        </Button>
                                    </div>
                                ) : clientConfirmedMontageReview ? (
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Клиент подтвердил работы
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            Переходите к шагу «Печать», чтобы
                                            назначить печатника.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Ожидаем ответ клиента
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            Пока клиент проверяет макет. Здесь
                                            появится действие, как только он
                                            ответит.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {project.montageReviewLink && (
                                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/6 bg-slate-950/45 p-4 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0 flex-1 text-sm break-all text-zinc-300">
                                        {project.montageReviewLink}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="shrink-0 border-white/10 bg-transparent text-white hover:bg-white/5"
                                        onClick={() => {
                                            if (project.montageReviewLink) {
                                                copy(project.montageReviewLink);
                                            }
                                        }}
                                    >
                                        {copiedText ===
                                        project.montageReviewLink ? (
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                        ) : (
                                            <Copy className="mr-2 h-4 w-4" />
                                        )}
                                        {copiedText ===
                                        project.montageReviewLink
                                            ? 'Скопировано'
                                            : 'Копировать'}
                                    </Button>
                                </div>
                            )}

                            {montageAssetsGallery}
                        </div>
                    )}

                    {activeStepKey === 'printing' && (
                        <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                                <h2 className="text-xl font-semibold text-white">
                                    Шаг 6. Финальное подтверждение
                                </h2>
                            </div>
                            <p className="mt-2 text-sm text-zinc-400">
                                Назначьте печатника, дождитесь готовности
                                тиража и закройте проект одной кнопкой.
                            </p>

                            <div className="mt-5 rounded-2xl border border-white/6 bg-slate-950/45 p-4">
                                {project.isCompleted ? (
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-300">
                                            Проект завершён
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            Тираж напечатан и подтверждён.
                                        </p>
                                    </div>
                                ) : canCompletePrinting ? (
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Печать завершена
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                Подтвердите готовность и
                                                закройте проект.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            disabled={
                                                completePrintingForm.processing
                                            }
                                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                                            onClick={() => {
                                                completePrintingForm.post(
                                                    completePrinting.url(
                                                        project.id,
                                                    ),
                                                    { preserveScroll: true },
                                                );
                                            }}
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            {completePrintingForm.processing
                                                ? 'Завершение...'
                                                : 'Подтвердить готовность'}
                                        </Button>
                                    </div>
                                ) : clientConfirmedMontageReview &&
                                  canApproveModeration ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Клиент подтвердил работы
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                Выберите печатника и запустите
                                                печать.
                                            </p>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                            <div className="grid gap-2">
                                                <Label className="text-zinc-300">
                                                    Печатник
                                                </Label>
                                                <Select
                                                    value={
                                                        moderationForm.data
                                                            .print_user_id
                                                    }
                                                    onValueChange={(value) =>
                                                        moderationForm.setData(
                                                            'print_user_id',
                                                            value,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full border-white/10 bg-slate-950/45 text-white">
                                                        <SelectValue placeholder="Выберите печатника" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {printUsers.map(
                                                            (user) => (
                                                                <SelectItem
                                                                    key={user.id}
                                                                    value={String(
                                                                        user.id,
                                                                    )}
                                                                >
                                                                    {user.name}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                type="button"
                                                disabled={
                                                    moderationForm.processing ||
                                                    moderationForm.data
                                                        .print_user_id === ''
                                                }
                                                className="bg-emerald-500 text-white hover:bg-emerald-600"
                                                onClick={() => {
                                                    moderationForm.post(
                                                        approveModeration.url(
                                                            project.id,
                                                        ),
                                                        { preserveScroll: true },
                                                    );
                                                }}
                                            >
                                                <Printer className="mr-2 h-4 w-4" />
                                                Отправить в печать
                                            </Button>
                                        </div>
                                    </div>
                                ) : project.currentStageSlug === 'printing' ? (
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {project.selectedPrintUserName
                                                ? `Печатник: ${project.selectedPrintUserName}`
                                                : 'Печатник работает'}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            {project.printingReadyAt
                                                ? 'Тираж готов — ждём подтверждения.'
                                                : 'Печать в процессе.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Ещё не готово к печати
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-400">
                                            Дождитесь подтверждения клиента на
                                            предыдущем шаге.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {canDownloadProjectArchive && (
                                <div className="mt-4">
                                    <Button
                                        asChild
                                        type="button"
                                        variant="outline"
                                        className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                    >
                                        <a
                                            href={
                                                project.downloads
                                                    .projectArchiveUrl
                                            }
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Скачать полный архив проекта
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            <Dialog
                open={activeMontageAsset !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveMontageAssetId(null);
                    }
                }}
            >
                <DialogContent className="max-w-4xl border-white/10 bg-zinc-950 text-white">
                    {activeMontageAsset && (
                        <>
                            <DialogTitle>{activeMontageAsset.name}</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Просмотр готовой работы и замечания клиента по
                                этому файлу.
                            </DialogDescription>

                            <img
                                src={activeMontageAsset.previewUrl ?? activeMontageAsset.url}
                                alt={activeMontageAsset.name}
                                className="mt-2 max-h-[70vh] w-full rounded-2xl object-contain"
                            />

                            {activeMontageAsset.requestedForRevision && (
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
                                        {activeMontageAssetComment?.trim() ||
                                            'Клиент отметил эту работу для правки без отдельного комментария.'}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    asChild
                                    type="button"
                                    variant="outline"
                                    className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                >
                                    <a
                                        href={downloadModeratorWork.url([
                                            project.id,
                                            activeMontageAsset.id,
                                        ])}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Скачать файл
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={previewImage !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewImage(null);
                    }
                }}
            >
                <DialogContent className="max-w-4xl border-white/10 bg-zinc-950 text-white">
                    {previewImage && (
                        <>
                            <DialogTitle>{previewImage.name}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Предпросмотр фотографии
                            </DialogDescription>
                            <img
                                src={previewImage.url}
                                alt={previewImage.name}
                                className="mt-2 max-h-[75vh] w-full rounded-2xl object-contain"
                            />
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={sourcePreview !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSourcePreview(null);
                    }
                }}
            >
                <DialogContent className="max-w-4xl border-white/10 bg-zinc-950 text-white">
                    {sourcePreview && (
                        <>
                            <DialogTitle className="truncate pr-10">
                                {sourcePreview.name}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Предпросмотр исходного файла
                            </DialogDescription>
                            <div className="overflow-hidden rounded-2xl bg-black/40">
                                {sourcePreview.previewUrl ? (
                                    <img
                                        src={sourcePreview.previewUrl}
                                        alt={sourcePreview.name}
                                        className="max-h-[65vh] w-full object-contain"
                                    />
                                ) : (
                                    <div className="flex h-64 w-full items-center justify-center text-zinc-500">
                                        <ImageIcon className="h-12 w-12" />
                                    </div>
                                )}
                            </div>
                            <div className="grid gap-1 text-xs text-zinc-400 sm:grid-cols-3">
                                <p>
                                    Размер: {formatBytes(sourcePreview.sizeBytes)}
                                </p>
                                <p>
                                    Тип: {sourcePreview.mimeType ?? 'Не указан'}
                                </p>
                                <p>
                                    Загружен: {formatDateTime(sourcePreview.uploadedAt)}
                                </p>
                            </div>
                            <Button
                                asChild
                                type="button"
                                variant="outline"
                                className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                                <a href={sourcePreview.downloadUrl}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Скачать файл
                                </a>
                            </Button>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md border-white/10 bg-zinc-950 text-white">
                    <DialogTitle>Удалить проект?</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Проект «{project.name}» и все связанные файлы будут удалены безвозвратно. Это действие нельзя отменить.
                    </DialogDescription>
                    <div className="mt-2 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="button"
                            disabled={deleteForm.processing}
                            className="bg-rose-600 text-white hover:bg-rose-700"
                            onClick={() => {
                                deleteForm.delete(destroy(project.id).url, {
                                    onSuccess: () => setDeleteDialogOpen(false),
                                });
                            }}
                        >
                            Удалить
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

type ModeratorWorkflowStep = {
    key: 'setup' | 'client' | 'montage' | 'design' | 'review' | 'printing';
    title: string;
    description: string;
    status: 'completed' | 'current' | 'upcoming';
};

function buildModeratorWorkflowSteps(
    currentStep: ModeratorWorkflowStep['key'],
    isCompleted: boolean,
): ModeratorWorkflowStep[] {
    const steps: Array<Omit<ModeratorWorkflowStep, 'status'>> = [
        {
            key: 'setup',
            title: 'Настройки',
            description: 'Ссылка и дедлайн',
        },
        {
            key: 'client',
            title: 'Клиент',
            description: 'Ожидаем и проверяем выбор',
        },
        {
            key: 'montage',
            title: 'Монтаж',
            description: 'Подготовка материалов',
        },
        {
            key: 'design',
            title: 'Дизайн',
            description: 'Виньетки и финальный макет',
        },
        {
            key: 'review',
            title: 'Клиент',
            description: 'Проверка и комментарии',
        },
        {
            key: 'printing',
            title: 'Печать',
            description: 'Финальное подтверждение',
        },
    ];

    if (isCompleted) {
        return steps.map((step) => ({ ...step, status: 'completed' }));
    }

    const currentIndex = steps.findIndex((step) => step.key === currentStep);

    return steps.map((step, index) => ({
        ...step,
        status:
            index < currentIndex
                ? 'completed'
                : index === currentIndex
                  ? 'current'
                  : 'upcoming',
    }));
}

function resolveModeratorWorkflowStep({
    isCompleted,
    currentStageSlug,
    selectedDesignerUserId,
    clientSelectionPublishedAt,
    canApproveSelection,
    canAssignDesigner,
    canPublishMontageReview,
    canSendBackToMontage,
    canApproveModeration,
    canCompletePrinting,
}: {
    isCompleted: boolean;
    currentStageSlug: string | null;
    selectedDesignerUserId: number | null;
    clientSelectionPublishedAt: string | null;
    canApproveSelection: boolean;
    canAssignDesigner: boolean;
    canPublishMontageReview: boolean;
    canSendBackToMontage: boolean;
    canApproveModeration: boolean;
    canCompletePrinting: boolean;
}): ModeratorWorkflowStep['key'] {
    if (isCompleted || canCompletePrinting || currentStageSlug === 'printing') {
        return 'printing';
    }

    if (
        canPublishMontageReview ||
        canSendBackToMontage ||
        canApproveModeration
    ) {
        return 'review';
    }

    if (
        canAssignDesigner ||
        currentStageSlug === 'moderation' ||
        (currentStageSlug === 'montage' && selectedDesignerUserId !== null)
    ) {
        return 'design';
    }

    if (currentStageSlug === 'montage') {
        return 'montage';
    }

    if (
        canApproveSelection ||
        clientSelectionPublishedAt !== null ||
        currentStageSlug === 'client-photo-selection'
    ) {
        return 'client';
    }

    return 'setup';
}

function formatMoney(value: string | null): string {
    if (value === null) {
        return 'Не рассчитана';
    }

    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 2,
    }).format(amount);
}

function SelectionMetric({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
                {description}
            </p>
        </div>
    );
}

function formatDateTime(value: string | null): string {
    if (value === null) {
        return 'Неизвестно';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return parsedDate.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatImageWord(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'фото';
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'фото';
    }

    return 'фото';
}

function formatStudentWord(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'ученик';
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'ученика';
    }

    return 'учеников';
}

function formatBytes(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(
        Math.floor(Math.log(value) / Math.log(1024)),
        units.length - 1,
    );
    const formattedValue = value / 1024 ** unitIndex;

    return `${formattedValue.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
