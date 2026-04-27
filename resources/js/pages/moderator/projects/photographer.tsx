import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { ArrowLeft, Folder, FolderOpen, MapPin, Phone } from 'lucide-react';
import {
    index as moderatorProjectIndex,
    show as moderatorProjectShow,
    showPhotographer,
} from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    albumSize: string;
    sourceImagesCount: number;
    sourceImagesTotalSizeBytes: number;
    totalPrice: string | null;
    currentStageName: string | null;
    currentStageDisplayName: string | null;
    currentStageSlug: string | null;
    hasClientLink: boolean;
    clientResponsesCount: number;
    publishedAt: string | null;
    deadlineAt: string | null;
};

type Props = {
    photographer: Photographer;
    projects: ProjectListItem[];
    status?: string | null;
};

export default function ModeratorPhotographerProjects({
    photographer,
    projects,
    status,
}: Props) {
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

            <div className="mx-auto flex max-w-7xl flex-col gap-8 p-4">
                <div className="space-y-4">
                    <Link
                        href={moderatorProjectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад к фотографам
                    </Link>

                    <div className="rounded-3xl border border-white/6 bg-slate-900/45 p-6 backdrop-blur-sm">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-4">
                                {photographer.avatar ? (
                                    <img
                                        src={photographer.avatar}
                                        alt={photographer.name}
                                        className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04] text-xl font-medium text-zinc-200 ring-1 ring-white/10">
                                        {photographer.name
                                            .slice(0, 1)
                                            .toUpperCase()}
                                    </div>
                                )}

                                <div>
                                    <h1 className="text-3xl font-semibold text-white md:text-4xl">
                                        {photographer.name}
                                    </h1>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
                                        {photographer.cityName && (
                                            <span className="inline-flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-zinc-600" />
                                                {photographer.cityName}
                                            </span>
                                        )}
                                        {photographer.phone && (
                                            <span className="inline-flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-zinc-600" />
                                                {photographer.phone}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-2">
                                            <Folder className="h-4 w-4 text-zinc-600" />
                                            {photographer.projectsCount}{' '}
                                            {formatProjectCount(
                                                photographer.projectsCount,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-full border border-white/8 bg-slate-950/45 px-4 py-3 text-sm text-zinc-400">
                                Откройте папку проекта для настройки выбора
                                клиента
                            </div>
                        </div>
                    </div>
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {projects.map((project) => (
                        <ProjectFolderCard key={project.id} project={project} />
                    ))}
                </div>
            </div>
        </>
    );
}

function ProjectFolderCard({ project }: { project: ProjectListItem }) {
    return (
        <Link
            href={moderatorProjectShow(project.id)}
            prefetch
            className="group flex flex-col items-center text-center"
        >
            <article className="w-full max-w-[190px] rounded-[1.75rem] border border-transparent px-3 py-3 transition-all duration-200">
                <div className="relative mx-auto w-full max-w-[168px] transition-transform duration-200 group-hover:-translate-y-1">
                    <FolderArtwork className="w-full drop-shadow-[0_12px_18px_rgba(16,185,129,0.18)]" />
                    <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-white/90 opacity-0 transition group-hover:opacity-100">
                        <FolderOpen className="h-4 w-4" />
                    </div>
                </div>

                <div className="mt-4 flex w-full flex-col items-center gap-3">
                    <h2 className="line-clamp-2 text-base leading-tight font-medium text-white">
                        {project.name}
                    </h2>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Badge
                            variant="outline"
                            className="border-white/10 bg-white/5 text-zinc-200"
                        >
                            {formatStorageSize(
                                project.sourceImagesTotalSizeBytes,
                            )}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        >
                            {formatMoney(project.totalPrice)}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="border-white/10 bg-white/5 text-zinc-200"
                        >
                            {project.className}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        >
                            {project.albumSize}
                        </Badge>
                    </div>
                </div>
            </article>
        </Link>
    );
}

function FolderArtwork({ className }: { className?: string }) {
    return (
        <div className={cn('relative aspect-[1.18/0.78]', className)}>
            <div className="absolute top-0 left-[3%] h-[27%] w-[36%] rounded-t-[18px] rounded-r-[18px] rounded-b-[8px] bg-[linear-gradient(180deg,#34d399_0%,#0f9f6e_100%)] shadow-[0_3px_0_rgba(6,78,59,0.18)]" />
            <div className="absolute top-[9%] right-0 h-[82%] w-full rounded-[18px] bg-[linear-gradient(180deg,#bff7dc_0%,#6ee7b7_52%,#18b881_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_4px_10px_rgba(0,0,0,0.16)]" />
            <div className="absolute inset-x-[2%] top-[13%] h-[10%] rounded-full bg-white/28 blur-sm" />
            <div className="absolute bottom-[10%] left-[10%] h-[18%] w-[58%] rounded-full bg-emerald-950/15 blur-xl" />
        </div>
    );
}

function formatProjectCount(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'проект';
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'проекта';
    }

    return 'проектов';
}

function formatStorageSize(sizeBytes: number): string {
    if (sizeBytes >= 1024 * 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
    }

    if (sizeBytes >= 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
    }

    if (sizeBytes >= 1024) {
        return `${Math.round(sizeBytes / 1024)} КБ`;
    }

    return `${sizeBytes} Б`;
}

function formatMoney(value: string | null): string {
    if (value === null) {
        return 'Без цены';
    }

    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(amount);
}
