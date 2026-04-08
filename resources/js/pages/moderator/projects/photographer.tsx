import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, ImageIcon, Link2, MapPin, Phone } from 'lucide-react';
import { index as moderatorProjectIndex, show as moderatorProjectShow, showPhotographer } from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Photographer = {
    id: number;
    name: string;
    phone: string | null;
    avatar: string | null;
    cityName: string | null;
    projectsCount: number;
};

type ProjectListItem = {
    id: number;
    name: string;
    className: string;
    sourceImagesCount: number;
    currentStageName: string | null;
    currentStageDisplayName: string | null;
    currentStageSlug: string | null;
    hasClientLink: boolean;
    clientSlotsCount: number;
    publishedAt: string | null;
};

type Props = {
    photographer: Photographer;
    projects: ProjectListItem[];
    status?: string | null;
};

export default function ModeratorPhotographerProjects({ photographer, projects, status }: Props) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Выбор клиента',
                href: moderatorProjectIndex(),
            },
            {
                title: photographer.name,
                href: showPhotographer(photographer.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Проекты | ${photographer.name}`} />

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="space-y-4">
                    <Link
                        href={moderatorProjectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад к фотографам
                    </Link>

                    <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-4">
                                {photographer.avatar ? (
                                    <img
                                        src={photographer.avatar}
                                        alt={photographer.name}
                                        className="h-16 w-16 rounded-2xl object-cover"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-xl font-semibold text-orange-200">
                                        {photographer.name.slice(0, 1).toUpperCase()}
                                    </div>
                                )}

                                <div>
                                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                                        {photographer.name}
                                    </h1>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
                                        {photographer.cityName && (
                                            <span className="inline-flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-orange-400" />
                                                {photographer.cityName}
                                            </span>
                                        )}
                                        {photographer.phone && (
                                            <span className="inline-flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-orange-400" />
                                                {photographer.phone}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-orange-400" />
                                            {photographer.projectsCount} {formatProjectCount(photographer.projectsCount)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                                Откройте нужный проект, чтобы настроить выбор клиента
                            </div>
                        </div>
                    </div>
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
                            className="flex h-full flex-col rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-5"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="border-orange-500/20 bg-orange-500/10 text-orange-200"
                                >
                                    {project.className}
                                </Badge>
                                {project.currentStageDisplayName && (
                                    <Badge
                                        variant="outline"
                                        className="border-white/10 bg-white/5 text-zinc-200"
                                    >
                                        {project.currentStageDisplayName}
                                    </Badge>
                                )}
                                {project.hasClientLink && (
                                    <Badge
                                        variant="outline"
                                        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                    >
                                        Ссылка активна
                                    </Badge>
                                )}
                            </div>

                            <div className="mt-4">
                                <h2 className="text-xl font-semibold leading-tight text-white md:text-2xl">
                                    {project.name}
                                </h2>
                                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-zinc-400">
                                    <span className="inline-flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-orange-400" />
                                        {project.sourceImagesCount} исходников
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <Link2 className="h-4 w-4 text-orange-400" />
                                        {project.clientSlotsCount} слотов
                                    </span>
                                </div>
                            </div>

                            <div className="mt-auto pt-6">
                                <Button
                                    asChild
                                    className="rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600"
                                >
                                    <Link href={moderatorProjectShow(project.id)} prefetch>
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

function formatProjectCount(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'проект';
    }

    if ([2, 3, 4].includes(count % 10) && ! [12, 13, 14].includes(count % 100)) {
        return 'проекта';
    }

    return 'проектов';
}
