import { Head, setLayoutProps, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Copy, ExternalLink, ImageIcon, Link2, Plus, Printer, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { approve as approveModeration, publishClientReview, sendBackToMontage } from '@/actions/App/Http/Controllers/Admin/ModerationReviewController';
import { approveSelection, index as moderatorProjectIndex, publishSelection, show as moderatorProjectShow, showPhotographer } from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';

type Slot = {
    id: number;
    name: string;
    maxLikes: number;
    selectedCount: number;
    selectedImages: Array<{
        id: number;
        name: string;
        url: string;
    }>;
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
        currentStageName: string | null;
        currentStageSlug: string | null;
        clientSelectionLink: string | null;
        clientSelectionPublishedAt: string | null;
        clientSelectionSubmittedAt: string | null;
        montageReviewLink: string | null;
        montageReviewPublishedAt: string | null;
        montageReviewSubmittedAt: string | null;
        canApproveModeration: boolean;
        printingReadyAt: string | null;
        selectedMontageUserId: number | null;
        selectedMontageUserName: string | null;
        selectedPrintUserId: number | null;
        selectedPrintUserName: string | null;
    };
    slots: Slot[];
    montageAssets: Array<{
        id: number;
        name: string;
        url: string;
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
    printUsers: Array<{
        id: number;
        name: string;
    }>;
    status?: string | null;
};

type SlotFormItem = {
    name: string;
    max_likes: string;
};

export default function ModeratorProjectShow({ project, slots, montageAssets, montageReview, montageUsers, printUsers, status }: Props) {
    const page = usePage<{ errors?: Record<string, string> }>();
    const [copiedText, copy] = useClipboard();
    const [activeMontageAssetId, setActiveMontageAssetId] = useState<number | null>(null);
    const form = useForm<{
        slots: SlotFormItem[];
    }>({
        slots:
            slots.length > 0
                ? slots.map((slot) => ({
                      name: slot.name,
                      max_likes: String(slot.maxLikes),
                  }))
                : [
                      { name: 'Главная обложка', max_likes: '1' },
                      { name: 'Вторая страница', max_likes: '2' },
                  ],
    });
    const approveForm = useForm<{
        montage_user_id: string;
    }>({
        montage_user_id: project.selectedMontageUserId
            ? String(project.selectedMontageUserId)
            : String(montageUsers[0]?.id ?? ''),
    });
    const canApproveSelection =
        project.clientSelectionSubmittedAt !== null
        && project.currentStageSlug === 'client-photo-selection'
        && montageUsers.length > 0;
    const moderationForm = useForm<{
        print_user_id: string;
    }>({
        print_user_id: project.selectedPrintUserId
            ? String(project.selectedPrintUserId)
            : String(printUsers[0]?.id ?? ''),
    });
    const publishReviewForm = useForm<Record<string, never>>({});
    const returnToMontageForm = useForm<Record<string, never>>({});
    const canApproveModeration = project.canApproveModeration;
    const canPublishMontageReview =
        project.currentStageSlug === 'moderation'
        && montageAssets.length > 0;
    const canSendBackToMontage =
        project.currentStageSlug === 'moderation'
        && project.montageReviewSubmittedAt !== null
        && montageReview.requestedAssets.length > 0;
    const revisionCommentsByAssetId = useMemo(
        () => new Map(montageReview.requestedAssets.map((asset) => [asset.id, asset.comment])),
        [montageReview.requestedAssets],
    );
    const activeMontageAsset = activeMontageAssetId === null
        ? null
        : montageAssets.find((asset) => asset.id === activeMontageAssetId) ?? null;
    const activeMontageAssetComment = activeMontageAsset === null
        ? null
        : revisionCommentsByAssetId.get(activeMontageAsset.id) ?? null;

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

            <div className="mx-auto flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant="outline"
                                className="border-orange-500/20 bg-orange-500/10 text-orange-200"
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

                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-white">
                                {project.name}
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                                Настройте лимиты выбора, отправьте клиенту ссылку,
                                затем проверьте его итоговый выбор. После монтажа
                                можно отправить готовые работы клиенту, получить
                                правки и вернуть проект на доработку.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {project.clientSelectionLink && (
                            <Button
                                asChild
                                variant="outline"
                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                                <a
                                    href={project.clientSelectionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Открыть клиентскую страницу
                                </a>
                            </Button>
                        )}

                        {project.montageReviewLink && (
                            <Button
                                asChild
                                variant="outline"
                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                                <a
                                    href={project.montageReviewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Открыть review-страницу
                                </a>
                            </Button>
                        )}

                        {canApproveSelection && (
                            <Button
                                type="button"
                                disabled={approveForm.processing || approveForm.data.montage_user_id === ''}
                                className="bg-orange-500 text-white hover:bg-orange-600"
                                onClick={() => {
                                    approveForm.post(approveSelection.url(project.id), {
                                        preserveScroll: true,
                                    });
                                }}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Подтвердить и отправить на монтаж
                            </Button>
                        )}

                        {canPublishMontageReview && (
                            <Button
                                type="button"
                                disabled={publishReviewForm.processing}
                                className="bg-white/10 text-white hover:bg-white/15"
                                onClick={() => {
                                    publishReviewForm.post(publishClientReview.url(project.id), {
                                        preserveScroll: true,
                                    });
                                }}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                {project.montageReviewPublishedAt
                                    ? 'Обновить ссылку клиенту'
                                    : 'Выдать ссылку на готовые работы'}
                            </Button>
                        )}

                        {canSendBackToMontage && (
                            <Button
                                type="button"
                                disabled={returnToMontageForm.processing}
                                className="bg-orange-500 text-white hover:bg-orange-600"
                                onClick={() => {
                                    returnToMontageForm.post(sendBackToMontage.url(project.id), {
                                        preserveScroll: true,
                                    });
                                }}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Вернуть на монтаж с правками
                            </Button>
                        )}

                        {canApproveModeration && (
                            <Button
                                type="button"
                                disabled={moderationForm.processing || moderationForm.data.print_user_id === ''}
                                className="bg-white/10 text-white hover:bg-white/15"
                                onClick={() => {
                                    moderationForm.post(approveModeration.url(project.id), {
                                        preserveScroll: true,
                                    });
                                }}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Подтвердить и отправить в печать
                            </Button>
                        )}
                    </div>
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

                {page.props.errors?.print_user_id && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {page.props.errors.print_user_id}
                    </div>
                )}

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">
                                        Настройки выбора клиента
                                    </h2>
                                    <p className="mt-2 text-sm text-zinc-400">
                                        Например: «Главная обложка — 1 фото»,
                                        «Вторая страница — 2 фото».
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                    onClick={() =>
                                        form.setData('slots', [
                                            ...form.data.slots,
                                            {
                                                name: `Новый блок ${form.data.slots.length + 1}`,
                                                max_likes: '1',
                                            },
                                        ])
                                    }
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Добавить блок
                                </Button>
                            </div>

                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    form.post(publishSelection.url(project.id));
                                }}
                            >
                                {form.data.slots.map((slot, index) => (
                                    <div
                                        key={`${index}-${slot.name}`}
                                        className="grid gap-4 rounded-2xl border border-white/6 bg-black/20 p-4 md:grid-cols-[minmax(0,1fr)_140px_auto]"
                                    >
                                        <div className="grid gap-2">
                                            <Label className="text-zinc-300">
                                                Название блока
                                            </Label>
                                            <Input
                                                value={slot.name}
                                                onChange={(event) => {
                                                    const nextSlots = [...form.data.slots];
                                                    nextSlots[index] = {
                                                        ...slot,
                                                        name: event.target.value,
                                                    };
                                                    form.setData('slots', nextSlots);
                                                }}
                                                placeholder="Главная обложка"
                                                className="border-white/10 bg-zinc-950/60 text-white"
                                            />
                                            <InputError
                                                message={form.errors[`slots.${index}.name`]}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label className="text-zinc-300">
                                                Макс. лайков
                                            </Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={slot.max_likes}
                                                onChange={(event) => {
                                                    const nextSlots = [...form.data.slots];
                                                    nextSlots[index] = {
                                                        ...slot,
                                                        max_likes: event.target.value,
                                                    };
                                                    form.setData('slots', nextSlots);
                                                }}
                                                className="border-white/10 bg-zinc-950/60 text-white"
                                            />
                                            <InputError
                                                message={form.errors[`slots.${index}.max_likes`]}
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                                disabled={form.data.slots.length === 1}
                                                onClick={() =>
                                                    form.setData(
                                                        'slots',
                                                        form.data.slots.filter((_, slotIndex) => slotIndex !== index),
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <InputError message={form.errors.slots} />

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="bg-orange-500 text-white hover:bg-orange-600"
                                    >
                                        {form.processing
                                            ? 'Сохранение...'
                                            : 'Сохранить и выдать ссылку'}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-orange-400" />
                                <h2 className="text-xl font-semibold text-white">
                                    Выбор клиента
                                </h2>
                            </div>

                            <p className="mt-2 text-sm text-zinc-400">
                                Здесь видны только фотографии, которые клиент
                                финально отправил кнопкой «Готово».
                            </p>

                            <div className="mt-5 space-y-4">
                                {slots.map((slot) => (
                                    <section
                                        key={slot.id}
                                        className="rounded-2xl border border-white/6 bg-black/20 p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-white">
                                                    {slot.name}
                                                </h3>
                                                <p className="mt-1 text-sm text-zinc-400">
                                                    Выбрано {slot.selectedCount} из {slot.maxLikes}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="border-white/10 bg-white/5 text-zinc-200"
                                            >
                                                {slot.selectedCount === slot.maxLikes
                                                    ? 'Блок заполнен'
                                                    : 'Еще не заполнен'}
                                            </Badge>
                                        </div>

                                        {slot.selectedImages.length > 0 ? (
                                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                {slot.selectedImages.map((image) => (
                                                    <article
                                                        key={image.id}
                                                        className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.03]"
                                                    >
                                                        <div className="aspect-[4/3] overflow-hidden bg-black/40">
                                                            <img
                                                                src={image.url}
                                                                alt={image.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="px-3 py-2 text-sm text-zinc-300">
                                                            {image.name}
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                                                Клиент еще не отправил фотографии для этого блока.
                                            </div>
                                        )}
                                    </section>
                                ))}
                            </div>
                        </div>

                        {montageAssets.length > 0 && (
                            <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6">
                                <div className="flex items-center gap-2">
                                    <Printer className="h-4 w-4 text-orange-400" />
                                    <h2 className="text-xl font-semibold text-white">
                                        Готовые работы от монтажёра
                                    </h2>
                                </div>

                                <p className="mt-2 text-sm text-zinc-400">
                                    {project.selectedMontageUserName
                                        ? `Исполнитель: ${project.selectedMontageUserName}.`
                                        : 'Исполнитель монтажа не указан.'}
                                </p>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {montageAssets.map((asset) => (
                                        <button
                                            key={asset.id}
                                            type="button"
                                            className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.03] text-left transition hover:border-white/12"
                                            onClick={() => setActiveMontageAssetId(asset.id)}
                                        >
                                            <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                                                <img
                                                    src={asset.url}
                                                    alt={asset.name}
                                                    className="h-full w-full object-cover"
                                                />
                                                {asset.requestedForRevision && (
                                                    <div className="pointer-events-none absolute left-3 top-3">
                                                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-orange-500/20">
                                                            Клиент просит правку
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-3 py-2 text-sm text-zinc-300">
                                                {asset.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}


                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                            <h3 className="text-lg font-semibold text-white">
                                Сводка проекта
                            </h3>
                            <div className="mt-4 space-y-3 text-sm text-zinc-400">
                                <p>Фотограф: {project.photographerName ?? 'Не указан'}</p>
                                <p>Телефон: {project.photographerPhone ?? 'Не указан'}</p>
                                <p>Исходников: {project.sourceImagesCount}</p>
                                <p>Альбом: {project.albumType}</p>
                                <p>Размер: {project.albumSize}</p>
                                <p>Обложка: {project.coverType}</p>
                            </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                            <h3 className="text-lg font-semibold text-white">
                                Монтажёр
                            </h3>

                            {montageUsers.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                    <Select
                                        value={approveForm.data.montage_user_id}
                                        onValueChange={(value) =>
                                            approveForm.setData('montage_user_id', value)
                                        }
                                    >
                                        <SelectTrigger className="w-full border-white/10 bg-black/20 text-white">
                                            <SelectValue placeholder="Выберите монтажёра" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {montageUsers.map((user) => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <p className="text-sm text-zinc-400">
                                        Этот монтажёр будет назначен ответственным
                                        сразу после перевода проекта на этап
                                        «Монтаж».
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-zinc-400">
                                    Нет доступных пользователей с ролью
                                    «Монтажер». Сначала создайте или активируйте
                                    монтажёра.
                                </p>
                            )}
                        </div>

                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                            <h3 className="text-lg font-semibold text-white">
                                Печатник
                            </h3>

                            {printUsers.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                    <Select
                                        value={moderationForm.data.print_user_id}
                                        onValueChange={(value) =>
                                            moderationForm.setData('print_user_id', value)
                                        }
                                    >
                                        <SelectTrigger className="w-full border-white/10 bg-black/20 text-white">
                                            <SelectValue placeholder="Выберите печатника" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {printUsers.map((user) => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <p className="text-sm text-zinc-400">
                                        Этот сотрудник будет назначен ответственным
                                        сразу после перевода проекта на этап
                                        «Печать».
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-zinc-400">
                                    Нет доступных пользователей с ролью
                                    «Печать». Сначала создайте или активируйте
                                    печатника.
                                </p>
                            )}
                        </div>

                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                            <h3 className="text-lg font-semibold text-white">
                                Статус проекта
                            </h3>
                            <div className="mt-4 space-y-3 text-sm text-zinc-400">
                                <p>
                                    Публикация:{' '}
                                    {project.clientSelectionPublishedAt
                                        ? 'Ссылка выдана клиенту'
                                        : 'Еще не опубликовано'}
                                </p>
                                <p>
                                    Клиент:{' '}
                                    {project.clientSelectionSubmittedAt
                                        ? 'Нажал «Готово»'
                                        : 'Еще выбирает фотографии'}
                                </p>
                                <p>
                                    Действие модератора:{' '}
                                    {canApproveSelection
                                        ? 'Выбрать монтажёра и отправить на монтаж'
                                        : canSendBackToMontage
                                          ? 'Вернуть проект на монтаж с правками клиента'
                                        : project.currentStageSlug === 'printing' && project.printingReadyAt
                                          ? 'Печать готова и уже возвращена модератору'
                                        : project.currentStageSlug === 'printing'
                                          ? 'Ожидать, пока печатник завершит печать'
                                        : canApproveModeration && !project.montageReviewPublishedAt
                                          ? 'Выбрать печатника, отправить в печать или сначала выдать клиенту ссылку на review'
                                        : canApproveModeration
                                          ? 'Выбрать печатника и отправить в печать'
                                        : canPublishMontageReview && project.montageReviewPublishedAt
                                          ? 'Ожидать замечания клиента по готовым работам'
                                        : canPublishMontageReview
                                          ? 'Выдать клиенту ссылку на готовые работы'
                                        : 'Ожидать завершения выбора'}
                                </p>
                                <p>
                                    Печать:{' '}
                                    {project.currentStageSlug !== 'printing'
                                        ? 'Еще не назначена'
                                        : project.printingReadyAt
                                          ? 'Печатник отметил проект как готовый'
                                          : project.selectedPrintUserName
                                            ? `В работе у ${project.selectedPrintUserName}`
                                            : 'Назначение не выбрано'}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                            <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-orange-400" />
                                <h3 className="text-lg font-semibold text-white">
                                    Публичная ссылка
                                </h3>
                            </div>

                            {project.clientSelectionLink ? (
                                <div className="mt-4 space-y-4">
                                    <div className="break-all rounded-2xl border border-white/6 bg-black/20 p-3 text-sm text-zinc-300">
                                        {project.clientSelectionLink}
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                            onClick={() => {
                                                if (project.clientSelectionLink) {
                                                    copy(project.clientSelectionLink);
                                                }
                                            }}
                                        >
                                            {copiedText === project.clientSelectionLink ? (
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                            ) : (
                                                <Copy className="mr-2 h-4 w-4" />
                                            )}
                                            {copiedText === project.clientSelectionLink
                                                ? 'Скопировано'
                                                : 'Копировать'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-zinc-400">
                                    Ссылка появится после первого сохранения
                                    настроек выбора.
                                </p>
                            )}
                        </div>

                        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                            <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-orange-400" />
                                <h3 className="text-lg font-semibold text-white">
                                    Ссылка на готовые работы
                                </h3>
                            </div>

                            {project.montageReviewLink ? (
                                <div className="mt-4 space-y-4">
                                    <div className="break-all rounded-2xl border border-white/6 bg-black/20 p-3 text-sm text-zinc-300">
                                        {project.montageReviewLink}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                        onClick={() => {
                                            if (project.montageReviewLink) {
                                                copy(project.montageReviewLink);
                                            }
                                        }}
                                    >
                                        {copiedText === project.montageReviewLink ? (
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                        ) : (
                                            <Copy className="mr-2 h-4 w-4" />
                                        )}
                                        {copiedText === project.montageReviewLink
                                            ? 'Скопировано'
                                            : 'Копировать'}
                                    </Button>
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-zinc-400">
                                    Ссылка появится после публикации готовых работ клиенту.
                                </p>
                            )}
                        </div>
                    </aside>
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
                                Просмотр готовой работы и замечания клиента по этому файлу.
                            </DialogDescription>

                            <img
                                src={activeMontageAsset.url}
                                alt={activeMontageAsset.name}
                                className="mt-2 max-h-[70vh] w-full rounded-2xl object-contain"
                            />

                            {activeMontageAsset.requestedForRevision && (
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
                                        {activeMontageAssetComment?.trim() || 'Клиент отметил эту работу для правки без отдельного комментария.'}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
