import { Head } from '@inertiajs/react';
import { BookOpen, ImagePlus, Sparkles } from 'lucide-react';

type AlbumPricingRule = {
    albumType: string;
    albumSize: string;
    coverType: string;
    coverPrice: number;
    pagePrice: number;
    pageCountUnit: string;
};

type PortraitPricingRule = {
    portraitCount: number;
    extraPrice: number;
};

type Props = {
    albumPricingRules: AlbumPricingRule[];
    portraitPricingRules: PortraitPricingRule[];
    status?: string | null;
};

export default function ProjectPricesIndex({
    albumPricingRules,
    portraitPricingRules,
    status,
}: Props) {
    return (
        <>
            <Head title="Правила цен" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-[28px] font-semibold text-white">
                        Правила цен
                    </h1>
                    <p className="max-w-3xl text-sm leading-relaxed text-[#A1A1AA]">
                        Цена проекта больше не берётся из базы данных. Она
                        считается в приложении по фиксированным правилам для
                        обложки, страниц или разворотов и количеству портреток.
                    </p>
                </div>

                {status ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                ) : null}

                <section className="rounded-2xl border border-white/5 bg-slate-900/55 p-6 shadow-xl backdrop-blur-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-white">
                                Альбомы
                            </h2>
                            <p className="text-sm text-zinc-400">
                                Доплата за обложку и цена за страницу или
                                разворот.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/8">
                        <div className="grid grid-cols-5 gap-4 border-b border-white/8 bg-white/5 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                            <div>Тип</div>
                            <div>Размер</div>
                            <div>Обложка</div>
                            <div>Обложка</div>
                            <div>Страница / разворот</div>
                        </div>

                        <div className="divide-y divide-white/8">
                            {albumPricingRules.map((rule) => (
                                <div
                                    key={`${rule.albumType}-${rule.albumSize}-${rule.coverType}`}
                                    className="grid grid-cols-5 gap-4 px-4 py-4 text-sm"
                                >
                                    <div className="font-medium text-white">
                                        {rule.albumType}
                                    </div>
                                    <div className="text-zinc-300">
                                        {rule.albumSize}
                                    </div>
                                    <div className="text-zinc-300">
                                        {rule.coverType}
                                    </div>
                                    <div className="text-zinc-300">
                                        +{formatCurrency(rule.coverPrice)}
                                    </div>
                                    <div className="text-zinc-300">
                                        {formatCurrency(rule.pagePrice)} /{' '}
                                        {rule.pageCountUnit}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/5 bg-slate-900/55 p-6 shadow-xl backdrop-blur-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                            <ImagePlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-white">
                                Портретки
                            </h2>
                            <p className="text-sm text-zinc-400">
                                Доплата за портретки на одного ученика.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {portraitPricingRules.map((rule) => (
                            <div
                                key={rule.portraitCount}
                                className="rounded-2xl border border-white/8 bg-white/5 p-4"
                            >
                                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
                                    Портреток
                                </div>
                                <div className="text-lg font-semibold text-white">
                                    {rule.portraitCount}
                                </div>
                                <div className="mt-2 text-sm text-zinc-300">
                                    +{formatCurrency(rule.extraPrice)}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5">
                    <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-5 w-5 text-amber-300" />
                        <p className="text-sm leading-relaxed text-amber-100/90">
                            Формула цены за один экземпляр: обложка + количество
                            страниц или разворотов × ставка + доплата за
                            портретки. Итоговая сумма проекта = цена одного
                            экземпляра × тираж.
                        </p>
                    </div>
                </section>
            </div>
        </>
    );
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(value);
}
