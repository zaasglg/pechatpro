import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { ExternalLink, ImageIcon, UserRound, WandSparkles } from 'lucide-react';
import { index as montageProjectIndex } from '@/actions/App/Http/Controllers/MontageProjectController';
import { show as showMontageWorks } from '@/actions/App/Http/Controllers/ProjectMontageAssetController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ProjectListItem = {
    id: number;
    name: string;
    className: string;
    photographerName: string | null;
    montageAssetsCount: number;
    currentStageName: string | null;
    currentStageSlug: string | null;
};

type Props = {
    projects: ProjectListItem[];
    status?: string | null;
};

export default function MontageProjectIndex({ projects, status }: Props) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Монтаж',
                href: montageProjectIndex(),
            },
        ],
    });

    return (
        <>
            <Head title="Проекты монтажёра" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        Проекты для монтажа
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                        Здесь видны только проекты, которые назначены вам и уже
                        переведены на этап монтажа.
                    </p>
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                <div className="grid gap-4 xl:grid-cols-2">
                    {projects.map((project) => (
                        <article
                            key={project.id}
                            className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className="border-orange-500/20 bg-orange-500/10 text-orange-200"
                                        >
                                            {project.className}
                                        </Badge>
                                        {project.currentStageName && (
                                            <Badge
                                                variant="outline"
                                                className="border-white/10 bg-white/5 text-zinc-200"
                                            >
                                                {project.currentStageName}
                                            </Badge>
                                        )}
                                    </div>

                                    <div>
                                        <h2 className="text-xl font-semibold text-white">
                                            {project.name}
                                        </h2>
                                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                                            <span className="inline-flex items-center gap-2">
                                                <UserRound className="h-4 w-4 text-orange-400" />
                                                {project.photographerName ?? 'Фотограф не указан'}
                                            </span>
                                            <span className="inline-flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4 text-orange-400" />
                                                {project.montageAssetsCount} готовых работ
                                            </span>
                                            <span className="inline-flex items-center gap-2">
                                                <WandSparkles className="h-4 w-4 text-orange-400" />
                                                Этап монтажа
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    asChild
                                    className="bg-orange-500 text-white hover:bg-orange-600"
                                >
                                    <Link href={showMontageWorks(project.id)} prefetch>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Открыть проект
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
