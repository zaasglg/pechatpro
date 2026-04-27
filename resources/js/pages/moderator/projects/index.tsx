import { Head, Link, router, setLayoutProps, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    FolderOpen,
    MapPin,
    Phone,
    Search,
    Trash2,
    UserRound,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    index as moderatorProjectIndex,
    showPhotographer,
} from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { destroy as destroyPhotographer } from '@/actions/App/Http/Controllers/Admin/PhotographerApprovalController';
import { Button } from '@/components/ui/button';
import { Input, inputStyles } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PhotographerListItem = {
    id: number;
    name: string;
    phone: string | null;
    avatar: string | null;
    cityName: string | null;
    projectsCount: number;
    projectsTotalPrice: string | null;
};

type CityOption = {
    id: number;
    name: string;
};

type Filters = {
    search: string;
    cityId: number | null;
};

type Props = {
    photographers: PhotographerListItem[];
    cities: CityOption[];
    filters: Filters;
    status?: string | null;
};

export default function ModeratorProjectIndex({
    photographers,
    cities,
    filters,
    status,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [cityId, setCityId] = useState(
        filters.cityId ? String(filters.cityId) : '',
    );
    const deleteForm = useForm({});

    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Выбор клиента',
                href: moderatorProjectIndex(),
            },
        ],
    });

    const applyFilters = (nextSearch: string, nextCityId: string) => {
        router.get(
            moderatorProjectIndex().url,
            {
                search: nextSearch.trim() || undefined,
                city_id: nextCityId || undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const submitFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, cityId);
    };

    const resetFilters = () => {
        setSearch('');
        setCityId('');
        applyFilters('', '');
    };

    const hasActiveFilters = filters.search !== '' || filters.cityId !== null;

    const totalAmount = photographers.reduce((sum, photographer) => {
        const amount = photographer.projectsTotalPrice
            ? Number(photographer.projectsTotalPrice)
            : 0;

        return Number.isNaN(amount) ? sum : sum + amount;
    }, 0);

    return (
        <>
            <Head title="Фотографы" />

            <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                            Фотографы
                        </h1>
                        <p className="mt-1 text-sm text-zinc-400">
                            Откройте проекты фотографа и ведите их по этапам.
                        </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        {photographers.length} найдено
                    </span>
                </div>

                {photographers.length > 0 && (
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-zinc-300">
                        Общая сумма проектов:{' '}
                        <span className="font-semibold text-emerald-200">
                            {formatMoney(String(totalAmount))}
                        </span>
                    </div>
                )}

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                <form
                    onSubmit={submitFilters}
                    className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-slate-900/40 p-2 backdrop-blur-sm sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Имя или телефон"
                            className="h-10 border-transparent bg-transparent pr-3 pl-10 text-white shadow-none focus-visible:border-white/15 focus-visible:bg-slate-950/40"
                        />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2">
                        <select
                            value={cityId}
                            onChange={(event) => {
                                const next = event.target.value;
                                setCityId(next);
                                applyFilters(search, next);
                            }}
                            className={cn(
                                inputStyles,
                                'h-10 min-w-[10rem] border-white/10 bg-slate-950/40 text-white',
                            )}
                        >
                            <option value="">Все города</option>
                            {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                    {city.name}
                                </option>
                            ))}
                        </select>

                        <Button
                            type="submit"
                            className="h-10 rounded-full bg-emerald-500 px-4 text-white hover:bg-emerald-600"
                        >
                            Поиск
                        </Button>

                        {hasActiveFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
                                onClick={resetFilters}
                                aria-label="Сбросить"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </form>

                {photographers.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/40 px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                            <UserRound className="h-5 w-5 text-emerald-300" />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-white">
                            Никого не нашли
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                            Попробуйте изменить поиск или выбрать другой город.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {photographers.map((photographer) => (
                            <article
                                key={photographer.id}
                                className="group flex h-full flex-col gap-4 rounded-2xl border border-white/8 bg-slate-900/40 p-4 backdrop-blur-sm transition hover:border-white/15 hover:bg-slate-900/55"
                            >
                                <div className="flex items-center gap-3">
                                    {photographer.avatar ? (
                                        <img
                                            src={photographer.avatar}
                                            alt={photographer.name}
                                            className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-base font-semibold text-emerald-200 ring-1 ring-emerald-500/20">
                                            {photographer.name
                                                .slice(0, 1)
                                                .toUpperCase()}
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate text-base font-semibold text-white">
                                            {photographer.name}
                                        </h2>
                                        {photographer.cityName && (
                                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-400">
                                                <MapPin className="h-3 w-3 text-emerald-300" />
                                                {photographer.cityName}
                                            </p>
                                        )}
                                    </div>

                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-slate-950/50 px-2.5 py-1 text-xs text-zinc-300">
                                        <FolderOpen className="h-3 w-3 text-emerald-300" />
                                        {photographer.projectsCount}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                                        {formatMoney(photographer.projectsTotalPrice)}
                                    </span>
                                    {photographer.phone && (
                                        <a
                                            href={`tel:${photographer.phone}`}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-slate-950/50 px-3 py-1 text-xs text-zinc-300 transition hover:border-emerald-400/30 hover:text-white"
                                        >
                                            <Phone className="h-3 w-3 text-emerald-300" />
                                            {photographer.phone}
                                        </a>
                                    )}
                                </div>

                                <div className="mt-auto flex items-center gap-2">
                                    <Button
                                        asChild
                                        className="h-10 flex-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
                                    >
                                        <Link
                                            href={showPhotographer(
                                                photographer.id,
                                            )}
                                            prefetch
                                        >
                                            Открыть проекты
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={deleteForm.processing}
                                        className="h-10 w-10 rounded-full text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                                        aria-label={`Удалить ${photographer.name}`}
                                        onClick={() => {
                                            if (
                                                !window.confirm(
                                                    `Удалить ${photographer.name}?`,
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
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

function formatMoney(value: string | null): string {
    const amount = value === null ? 0 : Number(value);

    if (Number.isNaN(amount)) {
        return value ?? '0 ₸';
    }

    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(amount);
}
