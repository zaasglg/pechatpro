import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { ArrowRight, Folder, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { index as moderatorProjectIndex, showPhotographer } from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { Button } from '@/components/ui/button';

type PhotographerListItem = {
    id: number;
    name: string;
    phone: string | null;
    avatar: string | null;
    cityName: string | null;
    projectsCount: number;
};

type Props = {
    photographers: PhotographerListItem[];
    status?: string | null;
};

export default function ModeratorProjectIndex({ photographers, status }: Props) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Выбор клиента',
                href: moderatorProjectIndex(),
            },
        ],
    });

    return (
        <>
            <Head title="Фотографы" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        Фотографы
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                        Выберите фотографа, чтобы открыть его проекты, настроить
                        выбор клиента и провести проект дальше по этапам.
                    </p>
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {photographers.map((photographer) => (
                        <article
                            key={photographer.id}
                            className="flex h-full flex-col rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5"
                        >
                            <div className="flex items-start gap-4">
                                {photographer.avatar ? (
                                    <img
                                        src={photographer.avatar}
                                        alt={photographer.name}
                                        className="h-14 w-14 rounded-2xl object-cover"
                                    />
                                ) : (
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-lg font-semibold text-orange-200">
                                        {photographer.name.slice(0, 1).toUpperCase()}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Фотограф
                                    </div>

                                    <h2 className="mt-3 text-xl font-semibold leading-tight text-white">
                                        {photographer.name}
                                    </h2>

                                    <div className="mt-4 space-y-2 text-sm text-zinc-400">
                                        {photographer.cityName && (
                                            <p className="inline-flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-orange-400" />
                                                {photographer.cityName}
                                            </p>
                                        )}
                                        {photographer.phone && (
                                            <p className="inline-flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-orange-400" />
                                                {photographer.phone}
                                            </p>
                                        )}
                                        <p className="inline-flex items-center gap-2">
                                            <Folder className="h-4 w-4 text-orange-400" />
                                            {photographer.projectsCount} {formatProjectCount(photographer.projectsCount)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                                        Доступно
                                    </p>
                                    <p className="mt-1 text-sm text-white">
                                        Проекты фотографа
                                    </p>
                                </div>

                                <Button
                                    asChild
                                    className="rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600"
                                >
                                    <Link href={showPhotographer(photographer.id)} prefetch>
                                        Открыть
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </>
    );
}

function formatProjectCount(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'проект';
    }

    if ([2, 3, 4].includes(count % 10) && ! [12, 13, 14].includes(count % 100)) {
        return 'проекта';
    }

    return 'проектов';
}
