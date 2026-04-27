import { Head, Link, setLayoutProps } from '@inertiajs/react';
import {
    ArrowRight,
    Camera,
    CheckCircle2,
    CircleAlert,
    ClipboardCheck,
    FolderPlus,
    Images,
    LayoutGrid,
    MapPinned,
    PackageCheck,
    Printer,
    ShieldCheck,
    Sparkles,
    Users,
    Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { index as cityIndex } from '@/actions/App/Http/Controllers/Admin/CityController';
import {
    show as showModeratorProject,
    index as moderatorProjectIndex,
} from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { index as photographerApprovalIndex } from '@/actions/App/Http/Controllers/Admin/PhotographerApprovalController';
import { index as projectPriceIndex } from '@/actions/App/Http/Controllers/Admin/ProjectPriceController';
import { index as montageProjectIndex } from '@/actions/App/Http/Controllers/MontageProjectController';
import {
    create as createProject,
    index as projectIndex,
    show as showProject,
} from '@/actions/App/Http/Controllers/PhotographerProjectController';
import {
    index as printProjectIndex,
    show as showPrintProject,
} from '@/actions/App/Http/Controllers/PrintProjectController';
import { show as showMontageWorks } from '@/actions/App/Http/Controllers/ProjectMontageAssetController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

type PhotographerDashboard = {
    stats: {
        totalProjects: number;
        totalSourceImages: number;
        totalSourceImagesSize: number;
        needsSourceUploads: number;
        waitingForClient: number;
        inProduction: number;
    };
    stageBreakdown: Array<{
        name: string;
        slug: string;
        count: number;
    }>;
    recentProjects: Array<{
        id: number;
        name: string;
        className: string;
        sourceImagesCount: number;
        currentStageName: string | null;
        currentStageSlug: string | null;
        updatedAt: string | null;
    }>;
};

type AdminDashboard = {
    stats: {
        totalProjects: number;
        activePhotographers: number;
        pendingPhotographers: number;
        totalCities: number;
        priceRulesCount: number;
    };
    recentProjects: Array<{
        id: number;
        name: string;
        className: string;
        photographerName: string | null;
        currentStageName: string | null;
        updatedAt: string | null;
    }>;
};

type ModeratorDashboard = {
    stats: {
        photographersWithProjects: number;
        waitingForSelectionSetup: number;
        waitingForClientChoice: number;
        waitingForModerationDecision: number;
        readyForPrint: number;
    };
    recentProjects: Array<{
        id: number;
        name: string;
        className: string;
        photographerName: string | null;
        currentStageName: string | null;
        needsModeratorAction: boolean;
    }>;
};

type MontageDashboard = {
    stats: {
        assignedProjects: number;
        activeMontage: number;
        withRevisionNotes: number;
        waitingModeratorReview: number;
        uploadedWorks: number;
    };
    assignedProjectsList: Array<{
        id: number;
        name: string;
        className: string;
        photographerName: string | null;
        currentStageName: string | null;
        montageAssetsCount: number;
        requestedForRevision: boolean;
    }>;
};

type PrintDashboard = {
    stats: {
        assignedProjects: number;
        waitingForPrint: number;
        completedPrints: number;
        readyWorks: number;
    };
    assignedProjectsList: Array<{
        id: number;
        name: string;
        className: string;
        photographerName: string | null;
        printingReadyAt: string | null;
        readyWorksCount: number;
    }>;
};

type Props = {
    dashboard: {
        role:
            | 'admin'
            | 'photographer'
            | 'moderator'
            | 'montage'
            | 'print'
            | 'default';
        admin?: AdminDashboard;
        photographer?: PhotographerDashboard;
        moderator?: ModeratorDashboard;
        montage?: MontageDashboard;
        print?: PrintDashboard;
    };
};

export default function Dashboard({ dashboard: dashboardData }: Props) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Аналитика',
                href: dashboard(),
            },
        ],
    });

    return (
        <>
            <Head title="PechatPRO | Аналитика" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4">
                {dashboardData.role === 'admin' && dashboardData.admin ? (
                    <AdminAnalytics dashboard={dashboardData.admin} />
                ) : null}

                {dashboardData.role === 'photographer' &&
                dashboardData.photographer ? (
                    <PhotographerAnalytics
                        dashboard={dashboardData.photographer}
                    />
                ) : null}

                {dashboardData.role === 'moderator' &&
                dashboardData.moderator ? (
                    <ModeratorAnalytics dashboard={dashboardData.moderator} />
                ) : null}

                {dashboardData.role === 'montage' && dashboardData.montage ? (
                    <MontageAnalytics dashboard={dashboardData.montage} />
                ) : null}

                {dashboardData.role === 'print' && dashboardData.print ? (
                    <PrintAnalytics dashboard={dashboardData.print} />
                ) : null}

                {dashboardData.role === 'default' ? <DefaultAnalytics /> : null}
            </div>
        </>
    );
}

function AdminAnalytics({ dashboard }: { dashboard: AdminDashboard }) {
    return (
        <>
            <DashboardHeader
                badge="Управление системой"
                title="Аналитика администратора"
                description="Здесь собраны ключевые показатели по фотографам, городам, прайсу и текущим проектам в системе."
                actions={
                    <>
                        <HeaderLink href={cityIndex()} icon={MapPinned}>
                            Города
                        </HeaderLink>
                        <HeaderLink
                            href={photographerApprovalIndex()}
                            icon={ShieldCheck}
                        >
                            Подтверждения
                        </HeaderLink>
                        <HeaderLink href={projectPriceIndex()} icon={Sparkles}>
                            Правила цен
                        </HeaderLink>
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    title="Всего проектов"
                    value={dashboard.stats.totalProjects}
                    hint="Все заказы в системе"
                    icon={LayoutGrid}
                />
                <StatCard
                    title="Активные фотографы"
                    value={dashboard.stats.activePhotographers}
                    hint="Подтверждённые пользователи"
                    icon={Camera}
                />
                <StatCard
                    title="Ждут подтверждения"
                    value={dashboard.stats.pendingPhotographers}
                    hint="Новые регистрации фотографов"
                    icon={CircleAlert}
                />
                <StatCard
                    title="Города"
                    value={dashboard.stats.totalCities}
                    hint="Доступны в регистрации и профиле"
                    icon={MapPinned}
                />
                <StatCard
                    title="Правила цен"
                    value={dashboard.stats.priceRulesCount}
                    hint="Активные конфигурации прайса"
                    icon={Sparkles}
                />
            </section>

            <section className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                <SectionHeading
                    title="Последние проекты"
                    description="Быстрый обзор новых и обновлённых заказов по всей системе."
                    badge={`${dashboard.recentProjects.length} записей`}
                />

                <div className="mt-6 space-y-3">
                    {dashboard.recentProjects.map((project) => (
                        <StaticListRow
                            key={project.id}
                            title={project.name}
                            meta={`${project.className} · ${project.photographerName ?? 'Фотограф не назначен'} · ${project.currentStageName ?? 'Этап не определён'}`}
                            label="Системный обзор"
                        />
                    ))}
                </div>
            </section>
        </>
    );
}

function PhotographerAnalytics({
    dashboard,
}: {
    dashboard: PhotographerDashboard;
}) {
    return (
        <>
            <DashboardHeader
                badge="Рабочая панель"
                title="Аналитика фотографа"
                description="Здесь видна текущая загрузка по проектам, где нужны исходники, что уже ждёт клиента и сколько заказов находится в производстве."
                actions={
                    <>
                        <HeaderLink href={projectIndex()} icon={LayoutGrid}>
                            Все проекты
                        </HeaderLink>
                        <HeaderPrimaryLink
                            href={createProject()}
                            icon={FolderPlus}
                        >
                            Новый проект
                        </HeaderPrimaryLink>
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Всего проектов"
                    value={dashboard.stats.totalProjects}
                    hint="Все ваши заказы в системе"
                    icon={Camera}
                />
                <StatCard
                    title="Загружено исходников"
                    value={dashboard.stats.totalSourceImages}
                    hint="Суммарно по всем проектам"
                    icon={Images}
                    sub={formatBytes(dashboard.stats.totalSourceImagesSize)}
                />
                <StatCard
                    title="Нужно загрузить"
                    value={dashboard.stats.needsSourceUploads}
                    hint="Проекты на старте работы"
                    icon={FolderPlus}
                />
                <StatCard
                    title="На производстве"
                    value={dashboard.stats.inProduction}
                    hint="Монтаж, модерация и печать"
                    icon={Sparkles}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                    <SectionHeading
                        title="Последние проекты"
                        description="Быстрый срез по последним изменениям."
                        badge={`${dashboard.recentProjects.length} записей`}
                    />

                    <div className="mt-6 space-y-3">
                        {dashboard.recentProjects.map((project) => (
                            <ProjectListRow
                                key={project.id}
                                href={showProject(project.id)}
                                title={project.name}
                                meta={`${project.className} · ${project.currentStageName ?? 'Этап не определён'} · ${project.sourceImagesCount} исходников`}
                                label="Открыть проект"
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                    <SectionHeading
                        title="Разбивка по этапам"
                        description="Сколько ваших проектов сейчас на каждом этапе."
                    />

                    <div className="mt-6 space-y-4">
                        {dashboard.stageBreakdown.map((stage) => (
                            <div key={stage.slug} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-zinc-300">
                                        {stage.name}
                                    </span>
                                    <span className="text-sm font-medium text-white">
                                        {stage.count}
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all"
                                        style={{
                                            width: `${stageWidth(stage.count, dashboard.stats.totalProjects)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded-[1.25rem] border border-white/6 bg-slate-950/45 p-4">
                        <p className="text-sm font-medium text-white">
                            Ожидают выбор клиента
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-emerald-300">
                            {dashboard.stats.waitingForClient}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                            Это проекты, где клиент сейчас выбирает фотографии.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}

function ModeratorAnalytics({ dashboard }: { dashboard: ModeratorDashboard }) {
    return (
        <>
            <DashboardHeader
                badge="Контроль этапов"
                title="Аналитика модератора"
                description="Здесь видно, какие проекты уже готовы к настройке выбора клиента, какие ответы ждут подтверждения и что можно переводить дальше в печать."
                actions={
                    <HeaderPrimaryLink
                        href={moderatorProjectIndex()}
                        icon={ClipboardCheck}
                    >
                        Открыть проекты
                    </HeaderPrimaryLink>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    title="Фотографов в работе"
                    value={dashboard.stats.photographersWithProjects}
                    hint="У кого уже есть проекты"
                    icon={Users}
                />
                <StatCard
                    title="Нужно настроить выбор"
                    value={dashboard.stats.waitingForSelectionSetup}
                    hint="Фотограф завершил съёмку"
                    icon={Images}
                />
                <StatCard
                    title="Клиент ещё выбирает"
                    value={dashboard.stats.waitingForClientChoice}
                    hint="Ожидается ответ клиента"
                    icon={Camera}
                />
                <StatCard
                    title="Нужно решение модератора"
                    value={dashboard.stats.waitingForModerationDecision}
                    hint="Подтвердить или вернуть на доработку"
                    icon={ShieldCheck}
                />
                <StatCard
                    title="Можно в печать"
                    value={dashboard.stats.readyForPrint}
                    hint="Проекты без незакрытых правок"
                    icon={Printer}
                />
            </section>

            <section className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                <SectionHeading
                    title="Проекты, требующие внимания"
                    description="Список помогает быстро понять, где сейчас нужен ваш шаг."
                    badge={`${dashboard.recentProjects.length} проектов`}
                />

                <div className="mt-6 space-y-3">
                    {dashboard.recentProjects.map((project) => (
                        <ProjectListRow
                            key={project.id}
                            href={showModeratorProject(project.id)}
                            title={project.name}
                            meta={`${project.className} · ${project.photographerName ?? 'Фотограф не указан'} · ${project.currentStageName ?? 'Этап не определён'}`}
                            label={
                                project.needsModeratorAction
                                    ? 'Нужно действие'
                                    : 'Текущий статус'
                            }
                            urgent={project.needsModeratorAction}
                        />
                    ))}
                </div>
            </section>
        </>
    );
}

function MontageAnalytics({ dashboard }: { dashboard: MontageDashboard }) {
    return (
        <>
            <DashboardHeader
                badge="Производство"
                title="Аналитика монтажёра"
                description="Здесь собраны назначенные вам проекты, количество загруженных работ и проекты, где клиент уже попросил правки."
                actions={
                    <HeaderPrimaryLink
                        href={montageProjectIndex()}
                        icon={Wrench}
                    >
                        Мои проекты монтажа
                    </HeaderPrimaryLink>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    title="Назначено проектов"
                    value={dashboard.stats.assignedProjects}
                    hint="Все проекты, закреплённые за вами"
                    icon={LayoutGrid}
                />
                <StatCard
                    title="Сейчас на монтаже"
                    value={dashboard.stats.activeMontage}
                    hint="Можно продолжать работу"
                    icon={Wrench}
                />
                <StatCard
                    title="Есть правки клиента"
                    value={dashboard.stats.withRevisionNotes}
                    hint="Нужно исправить отмеченные файлы"
                    icon={CircleAlert}
                />
                <StatCard
                    title="На проверке модератора"
                    value={dashboard.stats.waitingModeratorReview}
                    hint="Работы уже отправлены дальше"
                    icon={ClipboardCheck}
                />
                <StatCard
                    title="Загружено файлов"
                    value={dashboard.stats.uploadedWorks}
                    hint="Суммарно по вашим проектам"
                    icon={Images}
                />
            </section>

            <section className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                <SectionHeading
                    title="Назначенные проекты"
                    description="Последние проекты, где вы участвуете как исполнитель монтажа."
                    badge={`${dashboard.assignedProjectsList.length} проектов`}
                />

                <div className="mt-6 space-y-3">
                    {dashboard.assignedProjectsList.map((project) => (
                        <ProjectListRow
                            key={project.id}
                            href={showMontageWorks(project.id)}
                            title={project.name}
                            meta={`${project.className} · ${project.photographerName ?? 'Фотограф не указан'} · ${project.currentStageName ?? 'Этап не определён'} · ${project.montageAssetsCount} файлов`}
                            label={
                                project.requestedForRevision
                                    ? 'Есть правки клиента'
                                    : 'Открыть работы'
                            }
                            urgent={project.requestedForRevision}
                        />
                    ))}
                </div>
            </section>
        </>
    );
}

function PrintAnalytics({ dashboard }: { dashboard: PrintDashboard }) {
    return (
        <>
            <DashboardHeader
                badge="Финальный этап"
                title="Аналитика печати"
                description="Здесь видно, сколько проектов уже назначено вам на печать, сколько ещё ждут завершения и какие заказы уже отмечены как готовые."
                actions={
                    <HeaderPrimaryLink
                        href={printProjectIndex()}
                        icon={Printer}
                    >
                        Открыть печать
                    </HeaderPrimaryLink>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Назначено проектов"
                    value={dashboard.stats.assignedProjects}
                    hint="Все проекты, закреплённые за вами"
                    icon={LayoutGrid}
                />
                <StatCard
                    title="Ждут печати"
                    value={dashboard.stats.waitingForPrint}
                    hint="Можно приступать к выполнению"
                    icon={Printer}
                />
                <StatCard
                    title="Печать завершена"
                    value={dashboard.stats.completedPrints}
                    hint="Отмечены как готовые"
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Готовых файлов"
                    value={dashboard.stats.readyWorks}
                    hint="Материалы, доступные к печати"
                    icon={PackageCheck}
                />
            </section>

            <section className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                <SectionHeading
                    title="Мои проекты печати"
                    description="Последние назначенные проекты с готовыми работами от монтажёра."
                    badge={`${dashboard.assignedProjectsList.length} проектов`}
                />

                <div className="mt-6 space-y-3">
                    {dashboard.assignedProjectsList.map((project) => (
                        <ProjectListRow
                            key={project.id}
                            href={showPrintProject(project.id)}
                            title={project.name}
                            meta={`${project.className} · ${project.photographerName ?? 'Фотограф не указан'} · ${project.readyWorksCount} файлов${project.printingReadyAt ? ' · Печать завершена' : ''}`}
                            label={
                                project.printingReadyAt
                                    ? 'Готово'
                                    : 'Открыть проект'
                            }
                            urgent={!project.printingReadyAt}
                        />
                    ))}
                </div>
            </section>
        </>
    );
}

function DefaultAnalytics() {
    return (
        <>
            <DashboardHeader
                badge="Рабочая панель"
                title="Аналитика"
                description="Для вашей роли отдельный набор метрик пока не настроен."
            />

            <section className="rounded-[1.75rem] border border-white/6 bg-slate-900/45 px-6 py-10 text-center backdrop-blur-sm">
                <div className="mx-auto w-fit rounded-full bg-white/5 p-3 text-zinc-300">
                    <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">
                    Аналитика скоро появится
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                    Для этой роли дашборд пока без специальных метрик.
                </p>
            </section>
        </>
    );
}

function DashboardHeader({
    badge,
    title,
    description,
    actions,
}: {
    badge: string;
    title: string;
    description: string;
    actions?: ReactNode;
}) {
    return (
        <section>
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                    <Badge
                        variant="outline"
                        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                    >
                        {badge}
                    </Badge>
                    <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                        {title}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-zinc-400 md:text-base">
                        {description}
                    </p>
                </div>

                {actions ? (
                    <div className="flex flex-wrap gap-3">{actions}</div>
                ) : null}
            </div>
        </section>
    );
}

function HeaderLink({
    href,
    icon: Icon,
    children,
}: {
    href: Parameters<typeof Link>[0]['href'];
    icon: typeof LayoutGrid;
    children: ReactNode;
}) {
    return (
        <Button
            asChild
            variant="outline"
            className="border-white/10 bg-transparent text-white hover:bg-white/5"
        >
            <Link href={href} prefetch>
                <Icon className="mr-2 h-4 w-4" />
                {children}
            </Link>
        </Button>
    );
}

function HeaderPrimaryLink({
    href,
    icon: Icon,
    children,
}: {
    href: Parameters<typeof Link>[0]['href'];
    icon: typeof LayoutGrid;
    children: ReactNode;
}) {
    return (
        <Button
            asChild
            className="bg-emerald-500 text-white hover:bg-emerald-600"
        >
            <Link href={href} prefetch>
                <Icon className="mr-2 h-4 w-4" />
                {children}
            </Link>
        </Button>
    );
}

function SectionHeading({
    title,
    description,
    badge,
}: {
    title: string;
    description: string;
    badge?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm text-zinc-500">{description}</p>
            </div>
            {badge ? (
                <Badge
                    variant="outline"
                    className="border-white/10 bg-white/5 text-zinc-300"
                >
                    {badge}
                </Badge>
            ) : null}
        </div>
    );
}

function StatCard({
    title,
    value,
    hint,
    icon: Icon,
    sub,
}: {
    title: string;
    value: number;
    hint: string;
    icon: typeof LayoutGrid;
    sub?: string;
}) {
    return (
        <div className="rounded-[1.5rem] border border-white/6 bg-slate-900/45 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-300">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-semibold text-white">
                        {value}
                    </span>
                    {sub ? (
                        <span className="text-xs text-zinc-500">{sub}</span>
                    ) : null}
                </div>
            </div>
            <p className="mt-4 text-sm font-medium text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{hint}</p>
        </div>
    );
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Б';
    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

function ProjectListRow({
    href,
    title,
    meta,
    label,
    urgent = false,
}: {
    href: Parameters<typeof Link>[0]['href'];
    title: string;
    meta: string;
    label: string;
    urgent?: boolean;
}) {
    return (
        <Link
            href={href}
            prefetch
            className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-white/6 bg-slate-950/45 px-4 py-4 transition hover:border-emerald-500/25 hover:bg-emerald-500/5"
        >
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white md:text-base">
                    {title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{meta}</p>
            </div>

            <div className="flex items-center gap-3">
                <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${urgent ? 'bg-emerald-500/10 text-emerald-200' : 'bg-white/5 text-zinc-300'}`}
                >
                    {label}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
            </div>
        </Link>
    );
}

function StaticListRow({
    title,
    meta,
    label,
}: {
    title: string;
    meta: string;
    label: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-white/6 bg-slate-950/45 px-4 py-4">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white md:text-base">
                    {title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{meta}</p>
            </div>

            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                {label}
            </span>
        </div>
    );
}

function stageWidth(value: number, totalProjects: number): number {
    if (totalProjects === 0) {
        return 0;
    }

    return Math.max((value / totalProjects) * 100, value > 0 ? 8 : 0);
}
