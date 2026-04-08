import { Form, Head } from '@inertiajs/react';
import { CheckCircle2, Clock3, Phone, UserRound } from 'lucide-react';
import { approve, index as photographerApprovalIndex } from '@/actions/App/Http/Controllers/Admin/PhotographerApprovalController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PendingPhotographer = {
    id: number;
    name: string;
    phone: string;
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
    return (
        <>
            <Head title="Подтверждение фотографов" />

            <div className="flex w-full flex-col gap-6 p-6 md:p-10">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight text-white mb-2">
                            Подтверждение фотографов
                        </h1>
                        <p className="max-w-2xl text-sm leading-relaxed text-[#A1A1AA]">
                            Здесь появляются новые фотографы после регистрации.
                            Пока аккаунт не будет подтвержден, вход в
                            систему для них закрыт.
                        </p>
                    </div>
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                <Card className="mt-2 border-white/5 bg-[#0f0f11] shadow-xl rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="text-xl font-medium text-white mb-1.5">
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
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 px-6 py-14 text-center">
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
                                    className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#141417] p-5 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    <div className="flex gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF7B00]/10 text-[#FF7B00]">
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
                                                    <Phone className="h-4 w-4 text-[#FF7B00]" />
                                                    {photographer.phone}
                                                </span>
                                                <span className="inline-flex items-center gap-2">
                                                    <Clock3 className="h-4 w-4 text-[#FF7B00]" />
                                                    {formatRegisteredAt(
                                                        photographer.registeredAt,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Form
                                        {...approve.form(photographer.id)}
                                        className="lg:min-w-48"
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full rounded-full bg-[#FF7B00] hover:bg-[#FF7B00]/90 text-white font-medium"
                                            >
                                                {processing
                                                    ? 'Подтверждение...'
                                                    : 'Подтвердить фотографа'}
                                            </Button>
                                        )}
                                    </Form>
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
