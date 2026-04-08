import { Head, Link, setLayoutProps, usePage } from '@inertiajs/react';
import { ArrowRight, Camera, FolderPlus, Images, LayoutGrid, Sparkles } from 'lucide-react';
import { create as createProject, index as projectIndex, show as showProject } from '@/actions/App/Http/Controllers/PhotographerProjectController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

type PhotographerDashboard = {
    stats: {
        totalProjects: number;
        totalSourceImages: number;
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

type Props = {
    dashboard: {
        role: string;
        photographer?: PhotographerDashboard;
    };
};

export default function Dashboard({ dashboard: dashboardData }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isPhotographer = auth.user?.roles.includes('Фотограф') ?? false;

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

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:p-8">
                <section>
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="max-w-3xl">
                            <Badge
                                variant="outline"
                                className="border-orange-500/20 bg-orange-500/10 text-orange-200"
                            >
                                Рабочая панель
                            </Badge>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                                Аналитика фотографа
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-zinc-400 md:text-base">
                                Здесь видна текущая загрузка по проектам, где нужны
                                исходники, что уже ждёт клиента и сколько заказов
                                находится в производстве.
                            </p>
                        </div>

                        {isPhotographer && (
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                >
                                    <Link href={projectIndex()} prefetch>
                                        <LayoutGrid className="mr-2 h-4 w-4" />
                                        Все проекты
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    className="bg-orange-500 text-white hover:bg-orange-600"
                                >
                                    <Link href={createProject()} prefetch>
                                        <FolderPlus className="mr-2 h-4 w-4" />
                                        Новый проект
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </section>

                {dashboardData.role === 'photographer' && dashboardData.photographer ? (
                    <PhotographerAnalytics dashboard={dashboardData.photographer} />
                ) : (
                    <section className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] px-6 py-10 text-center">
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
                )}
            </div>
        </>
    );
}

function PhotographerAnalytics({ dashboard }: { dashboard: PhotographerDashboard }) {
    return (
        <>
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
                <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Последние проекты
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                Быстрый срез по последним изменениям.
                            </p>
                        </div>
                        <Badge
                            variant="outline"
                            className="border-white/10 bg-white/5 text-zinc-300"
                        >
                            {dashboard.recentProjects.length} записей
                        </Badge>
                    </div>

                    <div className="mt-6 space-y-3">
                        {dashboard.recentProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={showProject(project.id)}
                                prefetch
                                className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-white/6 bg-black/20 px-4 py-4 transition hover:border-orange-500/25 hover:bg-orange-500/5"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-medium text-white md:text-base">
                                            {project.name}
                                        </p>
                                        <Badge
                                            variant="outline"
                                            className="border-orange-500/15 bg-orange-500/10 text-orange-200"
                                        >
                                            {project.className}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {project.currentStageName ?? 'Этап не определён'}
                                        {' · '}
                                        {project.sourceImagesCount} исходников
                                    </p>
                                </div>

                                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6">
                    <h2 className="text-lg font-semibold text-white">
                        Разбивка по этапам
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Сколько ваших проектов сейчас на каждом этапе.
                    </p>

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
                                        className="h-full rounded-full bg-orange-500 transition-all"
                                        style={{
                                            width: `${stageWidth(stage.count, dashboard.stats.totalProjects)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                        <p className="text-sm font-medium text-white">
                            Ожидают выбор клиента
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-orange-300">
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

function StatCard({
    title,
    value,
    hint,
    icon: Icon,
}: {
    title: string;
    value: number;
    hint: string;
    icon: typeof Camera;
}) {
    return (
        <div className="rounded-[1.5rem] border border-white/6 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
                <div className="rounded-full bg-orange-500/10 p-2.5 text-orange-300">
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-3xl font-semibold tracking-tight text-white">
                    {value}
                </span>
            </div>
            <p className="mt-4 text-sm font-medium text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{hint}</p>
        </div>
    );
}

function stageWidth(value: number, totalProjects: number): number {
    if (totalProjects === 0) {
        return 0;
    }

    return Math.max((value / totalProjects) * 100, value > 0 ? 8 : 0);
}
