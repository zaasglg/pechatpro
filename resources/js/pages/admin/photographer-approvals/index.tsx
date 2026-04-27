import { Form, Head, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    ExternalLink,
    Phone,
    Trash2,
    UserRound,
} from 'lucide-react';
import {
    approve,
    destroy as destroyPhotographer,
    index as photographerApprovalIndex,
} from '@/actions/App/Http/Controllers/Admin/PhotographerApprovalController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PendingPhotographer = {
    id: number;
    name: string;
    phone: string;
    instagramUrl: string | null;
    registeredAt: string | null;
};

type Props = {
    pendingPhotographers: PendingPhotographer[];
    status?: string | null;
};

const registeredAtFormatter = new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export default function PhotographerApprovalsIndex({
    pendingPhotographers,
    status,
}: Props) {
    const deleteForm = useForm({});

    return (
        <>
            <Head title="Подтверждение фотографов" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="mb-2 text-[28px] font-semibold text-white">
                            Подтверждение фотографов
                        </h1>
                        <p className="max-w-2xl text-sm leading-relaxed text-[#A1A1AA]">
                            Здесь появляются новые фотографы после регистрации.
                            Пока аккаунт не будет подтвержден, вход в систему
                            для них закрыт.
                        </p>
                    </div>
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                <Card className="mt-2 rounded-2xl border-white/5 bg-slate-900/55 shadow-xl backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="mb-1.5 text-xl font-medium text-white">
                                Ожидают подтверждения
                            </CardTitle>
                            <p className="text-sm text-[#A1A1AA]">
                                {pendingPhotographers.length === 0
                                    ? 'Сейчас нет новых заявок от фотографов.'
                                    : `Новых заявок: ${pendingPhotographers.length}`}
                            </p>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                        {pendingPhotographers.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 px-6 py-14 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                                </div>
                                <h2 className="text-lg font-medium text-white">
                                    Все заявки обработаны
                                </h2>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Когда зарегистрируется новый фотограф, он
                                    появится в этом списке автоматически.
                                </p>
                            </div>
                        ) : (
                            pendingPhotographers.map((photographer) => (
                                <div
                                    key={photographer.id}
                                    className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-slate-900/35 p-5 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    <div className="flex gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                                            <UserRound className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col justify-center gap-3">
                                            <div className="space-y-1">
                                                <h2 className="text-base font-medium text-white">
                                                    {photographer.name}
                                                </h2>
                                                <p className="text-sm text-[#A1A1AA]">
                                                    Новый фотограф ожидает
                                                    доступа к системе
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-3 text-sm text-[#A1A1AA] sm:flex-row sm:items-center sm:gap-6">
                                                <span className="inline-flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-emerald-300" />
                                                    {photographer.phone}
                                                </span>
                                                <span className="inline-flex items-center gap-2">
                                                    <Clock3 className="h-4 w-4 text-emerald-300" />
                                                    {formatRegisteredAt(
                                                        photographer.registeredAt,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 lg:min-w-64">
                                        <Form
                                            action={approve(photographer.id)}
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        processing ||
                                                        deleteForm.processing
                                                    }
                                                    className="w-full rounded-full bg-emerald-500 font-medium text-white hover:bg-emerald-600"
                                                >
                                                    {processing
                                                        ? 'Подтверждение...'
                                                        : 'Подтвердить фотографа'}
                                                </Button>
                                            )}
                                        </Form>

                                        {photographer.instagramUrl && (
                                            <Button
                                                asChild
                                                type="button"
                                                variant="outline"
                                                className="w-full rounded-full border-cyan-500/20 bg-cyan-500/10 font-medium text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100"
                                            >
                                                <a
                                                    href={
                                                        photographer.instagramUrl
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Перейти в Instagram
                                                </a>
                                            </Button>
                                        )}

                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={deleteForm.processing}
                                            className="w-full rounded-full border-red-500/20 bg-transparent font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                            onClick={() => {
                                                if (
                                                    !window.confirm(
                                                        `Удалить фотографа ${photographer.name}?`,
                                                    )
                                                ) {
                                                    return;
                                                }

                                                deleteForm.delete(
                                                    destroyPhotographer.url(
                                                        photographer.id,
                                                    ),
                                                    {
                                                        preserveScroll: true,
                                                    },
                                                );
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {deleteForm.processing
                                                ? 'Удаление...'
                                                : 'Удалить фотографа'}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function formatRegisteredAt(value: string | null): string {
    if (!value) {
        return 'Дата регистрации недоступна';
    }

    return `Заявка от ${registeredAtFormatter.format(new Date(value))}`;
}

PhotographerApprovalsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Подтверждение фотографов',
            href: photographerApprovalIndex(),
        },
    ],
};
