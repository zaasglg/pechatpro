import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FolderPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    create as createProject,
    index as projectIndex,
    store as storeProject,
} from '@/actions/App/Http/Controllers/PhotographerProjectController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input, inputStyles } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    classOptions: string[];
    albumTypes: string[];
    albumSizes: string[];
    coverTypesByAlbumType: Record<string, string[]>;
    pageCountOptionsByAlbumType: Record<string, number[]>;
    pageCountUnitsByAlbumType: Record<string, string>;
};

type ProjectFormData = {
    name: string;
    class_name: string;
    album_type: string;
    album_size: string;
    cover_type: string;
    page_count: string;
    student_count: string;
    print_quantity: string;
};

type ProjectFormField = keyof ProjectFormData;

const stepFieldMap: Record<ProjectFormField, number> = {
    name: 0,
    class_name: 0,
    album_type: 1,
    album_size: 1,
    cover_type: 1,
    page_count: 2,
    student_count: 2,
    print_quantity: 2,
};

export default function ProjectCreate({
    classOptions,
    albumTypes,
    albumSizes,
    coverTypesByAlbumType,
    pageCountOptionsByAlbumType,
    pageCountUnitsByAlbumType,
}: Props) {
    const [currentStep, setCurrentStep] = useState(0);

    const form = useForm<ProjectFormData>({
        name: '',
        class_name: '',
        album_type: '',
        album_size: '',
        cover_type: '',
        page_count: '',
        student_count: '',
        print_quantity: '',
    });

    const steps = [
        {
            number: '1',
            shortTitle: 'Основное',
            title: 'Основная информация',
            description: 'Сначала укажите название проекта и класс.',
            fields: ['name', 'class_name'] as ProjectFormField[],
        },
        {
            number: '2',
            shortTitle: 'Альбом',
            title: 'Параметры альбома',
            description: 'Теперь выберите тип альбома, размер и обложку.',
            fields: ['album_type', 'album_size', 'cover_type'] as ProjectFormField[],
        },
        {
            number: '3',
            shortTitle: 'Тираж',
            title: 'Тираж и объём',
            description: 'В конце укажите страницы, количество учеников и тираж.',
            fields: ['page_count', 'student_count', 'print_quantity'] as ProjectFormField[],
        },
    ];

    const activeStep = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;
    const canGoNext = activeStep.fields.every((field) => form.data[field].trim() !== '');
    const availableCoverTypes = form.data.album_type
        ? (coverTypesByAlbumType[form.data.album_type] ?? [])
        : [];
    const availablePageCountOptions = form.data.album_type
        ? (pageCountOptionsByAlbumType[form.data.album_type] ?? [])
        : [];
    const pageCountUnit = form.data.album_type
        ? (pageCountUnitsByAlbumType[form.data.album_type] ?? 'страниц')
        : 'страниц';

    const setProjectField = (field: ProjectFormField, value: string) => {
        form.setData(field, value);
        form.clearErrors(field);
    };

    const goToStep = (stepIndex: number) => {
        setCurrentStep(stepIndex);
        form.clearErrors(...steps[stepIndex].fields);
    };

    const handleAlbumTypeChange = (albumType: string) => {
        const nextCoverTypes = coverTypesByAlbumType[albumType] ?? [];
        const nextPageCountOptions = (pageCountOptionsByAlbumType[albumType] ?? []).map(String);

        setProjectField('album_type', albumType);
        setProjectField('cover_type', nextCoverTypes[0] ?? '');

        if (!nextPageCountOptions.includes(form.data.page_count)) {
            setProjectField('page_count', '');
        }

        form.clearErrors('album_type', 'cover_type', 'page_count');
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(storeProject.url(), {
            onError: (errors) => {
                const firstErrorField = Object.keys(errors)[0] as ProjectFormField | undefined;

                if (!firstErrorField) {
                    return;
                }

                const stepIndex = stepFieldMap[firstErrorField];

                if (typeof stepIndex === 'number') {
                    setCurrentStep(stepIndex);
                }
            },
        });
    };

    const summaryItems = [
        {
            label: 'Класс',
            value: form.data.class_name || 'Не выбран',
        },
        {
            label: 'Альбом',
            value:
                form.data.album_type && form.data.album_size
                    ? `${form.data.album_type}, ${form.data.album_size}`
                    : 'Не настроен',
        },
        {
            label: form.data.album_type === 'Журнал' ? 'Страницы' : 'Развороты',
            value: form.data.page_count ? `${form.data.page_count} ${pageCountUnit}` : 'Не указано',
        },
        {
            label: 'Тираж',
            value: form.data.print_quantity ? `${form.data.print_quantity} шт.` : 'Не указано',
        },
    ];

    return (
        <>
            <Head title="Создать проект" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
                <div className="flex items-center justify-between">
                    <Link
                        href={projectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад к списку проектов
                    </Link>
                </div>

                <section className="rounded-[2rem] border border-white/8 bg-[#101010] p-6 shadow-xl shadow-black/20 md:p-8">
                    <div className="flex flex-col gap-4 border-b border-white/8 pb-6">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                            <FolderPlus className="h-3.5 w-3.5" />
                            Новый проект
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight text-white">
                                Создать проект
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                                Форма разбита на шаги, чтобы пользователю не приходилось видеть все поля сразу.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {steps.map((step, index) => (
                                <button
                                    key={step.number}
                                    type="button"
                                    onClick={() => {
                                        if (index <= currentStep) {
                                            goToStep(index);
                                        }
                                    }}
                                    className={cn(
                                        'rounded-full border px-3 py-1.5 transition-colors',
                                        index === currentStep
                                            ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                                            : index < currentStep
                                              ? 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/8'
                                              : 'border-white/8 bg-white/4 text-zinc-500',
                                    )}
                                >
                                    {step.number}. {step.shortTitle}
                                </button>
                            ))}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                            <div
                                className="h-full rounded-full bg-orange-500 transition-all duration-300"
                                style={{
                                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                                }}
                            />
                        </div>
                    </div>

                    <form onSubmit={submit} className="mt-6 grid gap-5">
                        {currentStep === 0 ? (
                            <SectionCard
                                number="1"
                                title="Основная информация"
                                description="Эти данные помогут сразу понять, для какого класса и альбома создаётся проект."
                            >
                                <div className="grid gap-5 md:grid-cols-2">
                                    <Field
                                        label="Название проекта"
                                        error={form.errors.name}
                                        description="Понятное название, которое вы потом легко найдёте в списке."
                                    >
                                        <Input
                                            value={form.data.name}
                                            onChange={(event) =>
                                                setProjectField('name', event.target.value)
                                            }
                                            placeholder="Например, Альбом 11 класса"
                                            className="border-white/10 bg-black/20 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                                        />
                                    </Field>

                                    <Field
                                        label="Класс"
                                        error={form.errors.class_name}
                                        description="Выберите класс или группу для проекта."
                                    >
                                        <select
                                            value={form.data.class_name}
                                            onChange={(event) =>
                                                setProjectField('class_name', event.target.value)
                                            }
                                            className={cn(
                                                inputStyles,
                                                'border-white/10 bg-black/20 text-white focus-visible:ring-orange-500',
                                            )}
                                        >
                                            <option value="">Выберите класс</option>
                                            {classOptions.map((classOption) => (
                                                <option key={classOption} value={classOption}>
                                                    {classOption}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </SectionCard>
                        ) : null}

                        {currentStep === 1 ? (
                            <SectionCard
                                number="2"
                                title="Параметры альбома"
                                description="Укажите формат альбома, размер и тип обложки."
                            >
                                <div className="grid gap-5 md:grid-cols-3">
                                    <Field label="Тип альбома" error={form.errors.album_type}>
                                        <select
                                            value={form.data.album_type}
                                            onChange={(event) =>
                                                handleAlbumTypeChange(event.target.value)
                                            }
                                            className={cn(
                                                inputStyles,
                                                'border-white/10 bg-black/20 text-white focus-visible:ring-orange-500',
                                            )}
                                        >
                                            <option value="">Выберите тип</option>
                                            {albumTypes.map((albumType) => (
                                                <option key={albumType} value={albumType}>
                                                    {albumType}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Размер" error={form.errors.album_size}>
                                        <select
                                            value={form.data.album_size}
                                            onChange={(event) =>
                                                setProjectField('album_size', event.target.value)
                                            }
                                            className={cn(
                                                inputStyles,
                                                'border-white/10 bg-black/20 text-white focus-visible:ring-orange-500',
                                            )}
                                        >
                                            <option value="">Выберите размер</option>
                                            {albumSizes.map((albumSize) => (
                                                <option key={albumSize} value={albumSize}>
                                                    {albumSize}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Обложка" error={form.errors.cover_type}>
                                        <select
                                            value={form.data.cover_type}
                                            onChange={(event) =>
                                                setProjectField('cover_type', event.target.value)
                                            }
                                            disabled={availableCoverTypes.length <= 1}
                                            className={cn(
                                                inputStyles,
                                                'border-white/10 bg-black/20 text-white focus-visible:ring-orange-500 disabled:opacity-100',
                                            )}
                                        >
                                            <option value="">
                                                {form.data.album_type
                                                    ? 'Тип обложки выбран автоматически'
                                                    : 'Сначала выберите тип альбома'}
                                            </option>
                                            {availableCoverTypes.map((coverType) => (
                                                <option key={coverType} value={coverType}>
                                                    {coverType}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </SectionCard>
                        ) : null}

                        {currentStep === 2 ? (
                            <>
                                <SectionCard
                                    number="3"
                                    title="Тираж и объём"
                                    description="Укажите, сколько страниц будет в альбоме и на какое количество учеников и печати он рассчитан."
                                >
                                    <div className="grid gap-5 md:grid-cols-3">
                                        <Field
                                            label={
                                                form.data.album_type === 'Журнал'
                                                    ? 'Количество страниц'
                                                    : 'Количество разворотов'
                                            }
                                            error={form.errors.page_count}
                                            description={
                                                form.data.album_type === 'Журнал'
                                                    ? 'Для журнала доступны только готовые варианты страниц.'
                                                    : form.data.album_type === 'Пластик'
                                                      ? 'Для пластика доступны значения от 1 до 20 разворотов.'
                                                      : form.data.album_type === 'Кожаный'
                                                        ? 'Для кожаного альбома доступны значения от 4 до 20 разворотов.'
                                                        : 'Сначала выберите тип альбома на предыдущем шаге.'
                                            }
                                        >
                                            <select
                                                value={form.data.page_count}
                                                onChange={(event) =>
                                                    setProjectField('page_count', event.target.value)
                                                }
                                                disabled={availablePageCountOptions.length === 0}
                                                className={cn(
                                                    inputStyles,
                                                    'border-white/10 bg-black/20 text-white focus-visible:ring-orange-500',
                                                )}
                                            >
                                                <option value="">
                                                    {form.data.album_type
                                                        ? `Выберите количество ${form.data.album_type === 'Журнал' ? 'страниц' : 'разворотов'}`
                                                        : 'Сначала выберите тип альбома'}
                                                </option>
                                                {availablePageCountOptions.map((pageCountOption) => (
                                                    <option
                                                        key={pageCountOption}
                                                        value={pageCountOption}
                                                    >
                                                        {pageCountOption} {pageCountUnit}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>

                                        <Field
                                            label="Количество учеников"
                                            error={form.errors.student_count}
                                        >
                                            <Input
                                                type="number"
                                                min={1}
                                                value={form.data.student_count}
                                                onChange={(event) =>
                                                    setProjectField('student_count', event.target.value)
                                                }
                                                placeholder="28"
                                                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                                            />
                                        </Field>

                                        <Field
                                            label="Тираж"
                                            error={form.errors.print_quantity}
                                            description="Сколько экземпляров нужно напечатать."
                                        >
                                            <Input
                                                type="number"
                                                min={1}
                                                value={form.data.print_quantity}
                                                onChange={(event) =>
                                                    setProjectField('print_quantity', event.target.value)
                                                }
                                                placeholder="30"
                                                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                                            />
                                        </Field>
                                    </div>
                                </SectionCard>

                                <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
                                    <p className="text-sm font-medium text-white">
                                        Проверьте перед созданием
                                    </p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        {summaryItems.map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
                                            >
                                                <p className="text-xs text-zinc-500">
                                                    {item.label}
                                                </p>
                                                <p className="mt-1 text-sm text-zinc-200">
                                                    {item.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : null}

                        <div className="flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-zinc-500">
                                Шаг {currentStep + 1} из {steps.length}. После создания проект появится в вашем списке и будет готов к загрузке исходников.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 sm:w-auto"
                                >
                                    <Link href={projectIndex()} prefetch>
                                        Отмена
                                    </Link>
                                </Button>
                                {currentStep > 0 ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => goToStep(currentStep - 1)}
                                        className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 sm:w-auto"
                                    >
                                        Назад
                                    </Button>
                                ) : null}
                                {isLastStep ? (
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto"
                                    >
                                        {form.processing
                                            ? 'Создание проекта...'
                                            : 'Создать проект'}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={() => goToStep(currentStep + 1)}
                                        disabled={!canGoNext}
                                        className="w-full bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-500/40 sm:w-auto"
                                    >
                                        Далее
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </section>
            </div>
        </>
    );
}

function Field({
    label,
    error,
    description,
    children,
}: {
    label: string;
    error?: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label className="text-zinc-300">{label}</Label>
            {description ? (
                <p className="text-xs leading-5 text-zinc-500">{description}</p>
            ) : null}
            {children}
            <InputError message={error} />
        </div>
    );
}

function SectionCard({
    number,
    title,
    description,
    children,
}: {
    number: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 border-b border-white/8 pb-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                        {number}
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-white">{title}</h2>
                        <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
            {children}
        </section>
    );
}

ProjectCreate.layout = {
    breadcrumbs: [
        {
            title: 'Проекты',
            href: projectIndex(),
        },
        {
            title: 'Создать проект',
            href: createProject(),
        },
    ],
};
