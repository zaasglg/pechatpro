import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Upload, X } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
    create as createProject,
    index as projectIndex,
    store as storeProject,
} from '@/actions/App/Http/Controllers/PhotographerProjectController';
import InputError from '@/components/input-error';
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

type ProjectFormData = {
    name: string;
    class_name: string;
    album_type: string;
    album_size: string;
    cover_type: string;
    page_count: string;
    portrait_count: string;
    student_count: string;
    print_quantity: string;
    design_files: File[];
};

type ProjectFormField = Exclude<keyof ProjectFormData, 'design_files'>;

export default function ProjectCreate({
    classOptions,
    albumTypes,
    albumSizes,
    coverTypesByAlbumType,
    pageCountOptionsByAlbumType,
    pageCountUnitsByAlbumType,
    albumPricingRules,
    portraitPricingRules,
}: Props) {
    const designFileInputRef = useRef<HTMLInputElement | null>(null);

    const form = useForm<ProjectFormData>({
        name: '',
        class_name: '',
        album_type: '',
        album_size: '',
        cover_type: '',
        page_count: '',
        portrait_count: '',
        student_count: '',
        print_quantity: '',
        design_files: [],
    });

    const availableCoverTypes = form.data.album_type
        ? (coverTypesByAlbumType[form.data.album_type] ?? [])
        : [];
    const availablePageCountOptions = form.data.album_type
        ? (pageCountOptionsByAlbumType[form.data.album_type] ?? [])
        : [];
    const pageCountUnit = form.data.album_type
        ? (pageCountUnitsByAlbumType[form.data.album_type] ?? 'страниц')
        : 'страниц';

    const selectedAlbumPricingRule = albumPricingRules.find(
        (rule) =>
            rule.albumType === form.data.album_type &&
            rule.albumSize === form.data.album_size &&
            rule.coverType === form.data.cover_type,
    );
    const selectedPortraitPricingRule = portraitPricingRules.find(
        (rule) => String(rule.portraitCount) === form.data.portrait_count,
    );
    const portraitExtraPrice = selectedPortraitPricingRule?.extraPrice ?? 0;
    const pageCountValue = Number(form.data.page_count || '0');
    const pageSubtotal =
        selectedAlbumPricingRule !== undefined
            ? selectedAlbumPricingRule.pagePrice * pageCountValue
            : null;

    const unitPrice =
        selectedAlbumPricingRule && form.data.page_count
            ? selectedAlbumPricingRule.coverPrice +
              selectedAlbumPricingRule.pagePrice * pageCountValue +
              portraitExtraPrice
            : null;

    const totalPrice =
        unitPrice !== null && form.data.print_quantity
            ? unitPrice * Number(form.data.print_quantity)
            : null;

    const setField = (field: ProjectFormField, value: string) => {
        form.setData(field, value);
        form.clearErrors(field);
    };

    const handleAlbumTypeChange = (albumType: string) => {
        const nextCoverTypes = coverTypesByAlbumType[albumType] ?? [];
        const nextPageCountOptions = (
            pageCountOptionsByAlbumType[albumType] ?? []
        ).map(String);

        form.setData((prev) => ({
            ...prev,
            album_type: albumType,
            cover_type: nextCoverTypes[0] ?? '',
            page_count: nextPageCountOptions.includes(prev.page_count)
                ? prev.page_count
                : '',
        }));
        form.clearErrors('album_type', 'cover_type', 'page_count');
    };

    const handleDesignFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(event.target.files ?? []);

        if (selected.length === 0) {
return;
}

        form.setData('design_files', [
            ...form.data.design_files,
            ...selected,
        ].slice(0, 5));
        form.clearErrors('design_files');

        if (designFileInputRef.current) {
            designFileInputRef.current.value = '';
        }
    };

    const removeDesignFile = (index: number) => {
        form.setData(
            'design_files',
            form.data.design_files.filter((_, i) => i !== index),
        );
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (form.data.design_files.length === 0) {
            form.setError('design_files', 'Загрузите файл дизайна');

            return;
        }

        form.post(storeProject.url(), {
            forceFormData: true,
            onError: (errors) => console.error('Ошибки формы:', errors),
        });
    };

    // Логика показа полей по порядку
    const showClassField = form.data.name.trim() !== '';
    const showAlbumTypeField = showClassField && form.data.class_name.trim() !== '';
    const showAlbumSizeField = showAlbumTypeField && form.data.album_type.trim() !== '';
    const showCoverTypeField = showAlbumSizeField && form.data.album_size.trim() !== '';
    const showPageCountField = showCoverTypeField && form.data.cover_type.trim() !== '';
    const showPortraitCount = showPageCountField && form.data.page_count.trim() !== '';
    const showStudentCount = showPortraitCount && form.data.portrait_count.trim() !== '';
    const showPrintQuantity = showStudentCount && form.data.student_count.trim() !== '';
    const showDesignFile = form.data.name.trim() !== '';
    const showPriceBlock = showPrintQuantity && form.data.print_quantity.trim() !== '';

    const stepsFilled = [
        form.data.name,
        form.data.class_name,
        form.data.album_type,
        form.data.album_size,
        form.data.cover_type,
        form.data.page_count,
        form.data.portrait_count,
        form.data.student_count,
        form.data.print_quantity,
    ].filter((v) => v.toString().trim() !== '').length;
    const totalSteps = 10;
    const filledSteps = stepsFilled + (form.data.design_files.length > 0 ? 1 : 0);
    const progressPercent = Math.round((filledSteps / totalSteps) * 100);

    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const dropped = Array.from(event.dataTransfer.files);

        if (dropped.length === 0) {
return;
}

        form.setData('design_files', [
            ...form.data.design_files,
            ...dropped,
        ].slice(0, 5));
        form.clearErrors('design_files');
    };

    return (
        <>
            <Head title="Создать проект" />

            <input
                ref={designFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleDesignFileChange}
            />

            <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-32 md:pt-10">
                <Link
                    href={projectIndex()}
                    prefetch
                    className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Проекты
                </Link>

                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-white md:text-3xl">
                            Новый проект
                        </h1>
                        <p className="mt-1 text-sm text-zinc-400">
                            Заполните поля — цена посчитается автоматически.
                        </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-zinc-400">
                        <div className="font-medium text-white">
                            {filledSteps} / {totalSteps}
                        </div>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/8">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <form id="project-create-form" onSubmit={submit} className="flex flex-col gap-5">
                    <Field label="Название" error={form.errors.name}>
                        <Input
                            value={form.data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="Альбом 11А класса"
                            className="h-12 border-white/10 bg-slate-950/50 text-base text-white placeholder:text-zinc-600 focus-visible:border-emerald-400/40 focus-visible:ring-emerald-400/20"
                        />
                    </Field>

                    {showDesignFile && (
                        <Field label="Файл дизайна" error={form.errors.design_files}>
                            <div className="flex flex-col gap-2">
                                {form.data.design_files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                                                <Check className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm text-white">
                                                    {file.name}
                                                </p>
                                                <p className="mt-0.5 text-xs text-zinc-500">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeDesignFile(index)}
                                            className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                                            aria-label="Удалить файл"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}

                                {form.data.design_files.length < 5 && (
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => designFileInputRef.current?.click()}
                                        className={cn(
                                            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition',
                                            isDragging
                                                ? 'border-emerald-400/60 bg-emerald-500/10'
                                                : 'border-white/15 bg-slate-950/40 hover:border-emerald-400/40 hover:bg-slate-900/50',
                                            form.errors.design_files && 'border-rose-500/60',
                                        )}
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                                            <Upload className="h-5 w-5 text-emerald-300" />
                                        </div>
                                        <p className="text-sm font-medium text-white">
                                            Перетащите файл или нажмите
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            PSD, AI, PDF, ZIP · до {5 - form.data.design_files.length} файл{5 - form.data.design_files.length === 1 ? '' : 'а'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {form.progress && (
                                <div className="mt-2 overflow-hidden rounded-full bg-white/8">
                                    <div
                                        className="h-1 rounded-full bg-emerald-500 transition-all"
                                        style={{ width: `${form.progress.percentage}%` }}
                                    />
                                </div>
                            )}
                        </Field>
                    )}

                    {showClassField && (
                        <Field label="Класс" error={form.errors.class_name}>
                            <OptionPills
                                options={classOptions}
                                value={form.data.class_name}
                                onChange={(v) => setField('class_name', v)}
                            />
                        </Field>
                    )}

                    {showAlbumTypeField && (
                        <Field label="Тип альбома" error={form.errors.album_type}>
                            <OptionPills
                                options={albumTypes}
                                value={form.data.album_type}
                                onChange={handleAlbumTypeChange}
                            />
                        </Field>
                    )}

                    {showAlbumSizeField && (
                        <Field label="Размер" error={form.errors.album_size}>
                            <OptionPills
                                options={albumSizes}
                                value={form.data.album_size}
                                onChange={(v) => setField('album_size', v)}
                            />
                        </Field>
                    )}

                    {showCoverTypeField && availableCoverTypes.length > 0 && (
                        <Field label="Обложка" error={form.errors.cover_type}>
                            {availableCoverTypes.length === 1 ? (
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                                    <Check className="h-3.5 w-3.5" />
                                    {availableCoverTypes[0]}
                                </div>
                            ) : (
                                <OptionPills
                                    options={availableCoverTypes}
                                    value={form.data.cover_type}
                                    onChange={(v) => setField('cover_type', v)}
                                />
                            )}
                        </Field>
                    )}

                    {showPageCountField && (
                        <Field
                            label={
                                form.data.album_type === 'Журнал'
                                    ? 'Количество страниц'
                                    : 'Количество разворотов'
                            }
                            error={form.errors.page_count}
                        >
                            <OptionPills
                                options={availablePageCountOptions.map(String)}
                                value={form.data.page_count}
                                onChange={(v) => setField('page_count', v)}
                                renderLabel={(v) => `${v} ${pageCountUnit}`}
                            />
                        </Field>
                    )}

                    {showPortraitCount && (
                        <Field
                            label="Количество портреток"
                            description="От 0 до 7 портреток на ученика."
                            error={form.errors.portrait_count}
                        >
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => {
                                    const value = String(n);
                                    const active = form.data.portrait_count === value;

                                    return (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setField('portrait_count', value)}
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
                        <Field label="Количество учеников" error={form.errors.student_count}>
                            <NumberWithPresets
                                value={form.data.student_count}
                                presets={[15, 20, 25, 30]}
                                placeholder="28"
                                onChange={(v) => setField('student_count', v)}
                            />
                        </Field>
                    )}

                    {showPrintQuantity && (
                        <Field label="Тираж" error={form.errors.print_quantity}>
                            <NumberWithPresets
                                value={form.data.print_quantity}
                                presets={
                                    form.data.student_count
                                        ? [
                                              Number(form.data.student_count),
                                              Number(form.data.student_count) + 5,
                                              Number(form.data.student_count) + 10,
                                          ]
                                        : [20, 30, 40]
                                }
                                placeholder="30"
                                onChange={(v) => setField('print_quantity', v)}
                                extraAction={
                                    form.data.student_count
                                        ? {
                                              label: 'Как учеников',
                                              onClick: () =>
                                                  setField(
                                                      'print_quantity',
                                                      form.data.student_count,
                                                  ),
                                          }
                                        : undefined
                                }
                            />
                        </Field>
                    )}
                </form>
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
                                        {form.data.print_quantity && (
                                            <span className="ml-2 text-sm font-normal text-zinc-500">
                                                · {form.data.print_quantity} шт ×{' '}
                                                {formatCurrency(unitPrice)}
                                            </span>
                                        )}
                                    </p>
                                    {/* {selectedAlbumPricingRule && pageSubtotal !== null ? (
                                        <p className="mt-1 text-xs text-zinc-400">
                                            Обложка{' '}
                                            {formatCurrency(
                                                selectedAlbumPricingRule.coverPriчce,
                                            )}{' '}
                                            + {pageCountValue}{' '}
                                            {selectedAlbumPricingRule.pageCountUnit}{' '}
                                            ×{' '}
                                            {formatCurrency(
                                                selectedAlbumPricingRule.pagePrice,
                                            )}
                                            {portraitExtraPrice > 0
                                                ? ` + портретки ${formatCurrency(portraitExtraPrice)}`
                                                : ''}
                                        </p>
                                    ) : null} */}
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-zinc-500">
                                        Заполните поля, чтобы увидеть цену
                                    </p>
                                    <p className="text-sm text-zinc-300">
                                        Прогресс: {filledSteps} из {totalSteps}
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                asChild
                                variant="outline"
                                className="border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
                            >
                                <Link href={projectIndex()} prefetch>
                                    Отмена
                                </Link>
                            </Button>
                            <Button
                                type="submit"
                                form="project-create-form"
                                disabled={
                                    form.processing ||
                                    unitPrice === null ||
                                    form.data.design_files.length === 0
                                }
                                className="bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-white/10 disabled:text-zinc-500"
                            >
                                {form.processing
                                    ? 'Создание...'
                                    : unitPrice === null && showPriceBlock
                                      ? 'Цена недоступна'
                                      : 'Создать проект'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
return `${bytes} Б`;
}

    if (bytes < 1024 * 1024) {
return `${(bytes / 1024).toFixed(1)} КБ`;
}

    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function Field({
    label,
    description,
    error,
    children,
}: {
    label: string;
    description?: string;
    error?: string;
    children: ReactNode;
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
            <InputError message={error} />
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

ProjectCreate.layout = {
    breadcrumbs: [
        { title: 'Проекты', href: projectIndex() },
        { title: 'Создать проект', href: createProject() },
    ],
};
