import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { index as projectIndex } from '@/actions/App/Http/Controllers/PhotographerProjectController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    classOptions: string[];
    albumTypes: string[];
    albumSizes: string[];
    coverTypesByAlbumType: Record<string, string[]>;
    pageCountOptionsByAlbumType: Record<string, number[]>;
    pageCountUnitsByAlbumType: Record<string, string>;
    albumPricingRules: Array<{
        albumType: string;
        albumSize: string;
        coverType: string;
        coverPrice: number;
        pagePrice: number;
        pageCountUnit: string;
    }>;
    portraitPricingRules: Array<{
        portraitCount: number;
        extraPrice: number;
    }>;
};

export default function PriceCalculator({
    classOptions,
    albumTypes,
    albumSizes,
    coverTypesByAlbumType,
    pageCountOptionsByAlbumType,
    pageCountUnitsByAlbumType,
    albumPricingRules,
    portraitPricingRules,
}: Props) {
    const [className, setClassName] = useState('');
    const [albumType, setAlbumType] = useState('');
    const [albumSize, setAlbumSize] = useState('');
    const [coverType, setCoverType] = useState('');
    const [pageCount, setPageCount] = useState('');
    const [portraitCount, setPortraitCount] = useState('');
    const [studentCount, setStudentCount] = useState('');
    const [printQuantity, setPrintQuantity] = useState('');

    const availableCoverTypes = albumType
        ? (coverTypesByAlbumType[albumType] ?? [])
        : [];
    const availablePageCountOptions = albumType
        ? (pageCountOptionsByAlbumType[albumType] ?? [])
        : [];
    const pageCountUnit = albumType
        ? (pageCountUnitsByAlbumType[albumType] ?? 'страниц')
        : 'страниц';

    const selectedAlbumPricingRule = albumPricingRules.find(
        (rule) =>
            rule.albumType === albumType &&
            rule.albumSize === albumSize &&
            rule.coverType === coverType,
    );
    const selectedPortraitPricingRule = portraitPricingRules.find(
        (rule) => String(rule.portraitCount) === portraitCount,
    );
    const portraitExtraPrice = selectedPortraitPricingRule?.extraPrice ?? 0;
    const pageCountValue = Number(pageCount || '0');

    const unitPrice =
        selectedAlbumPricingRule && pageCount
            ? selectedAlbumPricingRule.coverPrice +
              selectedAlbumPricingRule.pagePrice * pageCountValue +
              portraitExtraPrice
            : null;

    const totalPrice =
        unitPrice !== null && printQuantity
            ? unitPrice * Number(printQuantity)
            : null;

    const handleAlbumTypeChange = (type: string) => {
        const nextCoverTypes = coverTypesByAlbumType[type] ?? [];
        const nextPageCountOptions = (
            pageCountOptionsByAlbumType[type] ?? []
        ).map(String);

        setAlbumType(type);
        setCoverType(nextCoverTypes[0] ?? '');
        if (!nextPageCountOptions.includes(pageCount)) {
            setPageCount('');
        }
    };

    const showClassField = true;
    const showAlbumTypeField = className.trim() !== '';
    const showAlbumSizeField = showAlbumTypeField && albumType.trim() !== '';
    const showCoverTypeField = showAlbumSizeField && albumSize.trim() !== '';
    const showPageCountField = showCoverTypeField && coverType.trim() !== '';
    const showPortraitCount = showPageCountField && pageCount.trim() !== '';
    const showStudentCount = showPortraitCount && portraitCount.trim() !== '';
    const showPrintQuantity = showStudentCount && studentCount.trim() !== '';
    const showPriceBlock = showPrintQuantity && printQuantity.trim() !== '';

    const stepsFilled = [
        className,
        albumType,
        albumSize,
        coverType,
        pageCount,
        portraitCount,
        studentCount,
        printQuantity,
    ].filter((v) => v.toString().trim() !== '').length;
    const totalSteps = 9;
    const progressPercent = Math.round((stepsFilled / totalSteps) * 100);

    return (
        <>
            <Head title="Узнать цену" />

            <div className="min-h-screen bg-[#0f172a]">
                <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-32 md:pt-10">
                    <Link
                        href="/"
                        className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        На главную
                    </Link>

                    <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-white md:text-3xl">
                                Узнать цену
                            </h1>
                            <p className="mt-1 text-sm text-zinc-400">
                                Заполните поля — цена посчитается автоматически.
                            </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-zinc-400">
                            <div className="font-medium text-white">
                                {stepsFilled} / {totalSteps}
                            </div>
                            <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/8">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <Field label="Класс">
                            <OptionPills
                                options={classOptions}
                                value={className}
                                onChange={setClassName}
                            />
                        </Field>

                        {showAlbumTypeField && (
                            <Field label="Тип альбома">
                                <OptionPills
                                    options={albumTypes}
                                    value={albumType}
                                    onChange={handleAlbumTypeChange}
                                />
                            </Field>
                        )}

                        {showAlbumSizeField && (
                            <Field label="Размер">
                                <OptionPills
                                    options={albumSizes}
                                    value={albumSize}
                                    onChange={setAlbumSize}
                                />
                            </Field>
                        )}

                        {showCoverTypeField && availableCoverTypes.length > 0 && (
                            <Field label="Обложка">
                                {availableCoverTypes.length === 1 ? (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                                        <Check className="h-3.5 w-3.5" />
                                        {availableCoverTypes[0]}
                                    </div>
                                ) : (
                                    <OptionPills
                                        options={availableCoverTypes}
                                        value={coverType}
                                        onChange={setCoverType}
                                    />
                                )}
                            </Field>
                        )}

                        {showPageCountField && (
                            <Field
                                label={
                                    albumType === 'Журнал'
                                        ? 'Количество страниц'
                                        : 'Количество разворотов'
                                }
                            >
                                <OptionPills
                                    options={availablePageCountOptions.map(String)}
                                    value={pageCount}
                                    onChange={setPageCount}
                                    renderLabel={(v) => `${v} ${pageCountUnit}`}
                                />
                            </Field>
                        )}

                        {showPortraitCount && (
                            <Field
                                label="Количество портреток"
                                description="От 0 до 7 портреток на ученика."
                            >
                                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => {
                                        const value = String(n);
                                        const active = portraitCount === value;

                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setPortraitCount(value)}
                                                className={cn(
                                                    'h-11 rounded-xl border text-sm font-medium transition',
                                                    active
                                                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                                                        : 'border-white/8 bg-slate-950/50 text-zinc-300 hover:border-white/20 hover:text-white',
                                                )}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>
                        )}

                        {showStudentCount && (
                            <Field label="Количество учеников">
                                <NumberWithPresets
                                    value={studentCount}
                                    presets={[15, 20, 25, 30]}
                                    placeholder="28"
                                    onChange={setStudentCount}
                                />
                            </Field>
                        )}

                        {showPrintQuantity && (
                            <Field label="Тираж">
                                <NumberWithPresets
                                    value={printQuantity}
                                    presets={
                                        studentCount
                                            ? [
                                                  Number(studentCount),
                                                  Number(studentCount) + 5,
                                                  Number(studentCount) + 10,
                                              ]
                                            : [20, 30, 40]
                                    }
                                    placeholder="30"
                                    onChange={setPrintQuantity}
                                    extraAction={
                                        studentCount
                                            ? {
                                                  label: 'Как учеников',
                                                  onClick: () =>
                                                      setPrintQuantity(studentCount),
                                              }
                                            : undefined
                                    }
                                />
                            </Field>
                        )}
                    </div>
                </div>

                {/* Sticky итог */}
                {(showPriceBlock || showClassField) && (
                    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-slate-950/90 backdrop-blur-md">
                        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                {showPriceBlock && unitPrice !== null ? (
                                    <>
                                        <p className="text-xs text-zinc-500">Итого к оплате</p>
                                        <p className="text-xl font-semibold text-white tabular-nums">
                                            {totalPrice !== null
                                                ? formatCurrency(totalPrice)
                                                : '—'}
                                            {printQuantity && (
                                                <span className="ml-2 text-sm font-normal text-zinc-500">
                                                    · {printQuantity} шт ×{' '}
                                                    {formatCurrency(unitPrice)}
                                                </span>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-zinc-500">
                                            Заполните поля, чтобы увидеть цену
                                        </p>
                                        <p className="text-sm text-zinc-300">
                                            Прогресс: {stepsFilled} из {totalSteps}
                                        </p>
                                    </>
                                )}
                            </div>

                            <Button
                                asChild
                                className="bg-emerald-500 text-white hover:bg-emerald-600"
                            >
                                <Link href="/" prefetch>
                                    На главную
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
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

function Field({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                {label}
            </Label>
            {children}
            {description ? (
                <p className="text-xs text-zinc-500">{description}</p>
            ) : null}
        </div>
    );
}

function OptionPills({
    options,
    value,
    onChange,
    renderLabel,
}: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    renderLabel?: (value: string) => string;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const active = option === value;

                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition',
                            active
                                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                                : 'border-white/10 bg-slate-950/50 text-zinc-300 hover:border-white/25 hover:text-white',
                        )}
                    >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {renderLabel ? renderLabel(option) : option}
                    </button>
                );
            })}
        </div>
    );
}

function NumberWithPresets({
    value,
    presets,
    placeholder,
    onChange,
    extraAction,
}: {
    value: string;
    presets: number[];
    placeholder: string;
    onChange: (value: string) => void;
    extraAction?: { label: string; onClick: () => void };
}) {
    return (
        <div className="flex flex-col gap-2">
            <Input
                type="number"
                min={1}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-12 border-white/10 bg-slate-950/50 text-base text-white placeholder:text-zinc-600 focus-visible:border-emerald-400/40 focus-visible:ring-emerald-400/20"
            />
            <div className="flex flex-wrap gap-2">
                {presets.map((preset) => {
                    const active = value === String(preset);

                    return (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => onChange(String(preset))}
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs transition',
                                active
                                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                                    : 'border-white/10 bg-slate-950/40 text-zinc-400 hover:border-white/20 hover:text-white',
                            )}
                        >
                            {preset}
                        </button>
                    );
                })}
                {extraAction && (
                    <button
                        type="button"
                        onClick={extraAction.onClick}
                        className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs text-zinc-400 transition hover:border-emerald-400/30 hover:text-emerald-200"
                    >
                        {extraAction.label}
                    </button>
                )}
            </div>
        </div>
    );
}
