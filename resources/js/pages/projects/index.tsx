import { Head, Link } from '@inertiajs/react';
import { FolderOpen, FolderPlus } from 'lucide-react';
import {
    create as createProject,
    index as projectIndex,
    show as showProject,
} from '@/actions/App/Http/Controllers/PhotographerProjectController';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ProjectListItem = {
    id: number;
    name: string;
    className: string;
    albumType: string;
    albumSize: string;
    coverType: string;
    pageCount: number;
    studentCount: number;
    printQuantity: number;
    createdAt: string | null;
};

type Props = {
    projects: ProjectListItem[];
    status?: string | null;
};

export default function ProjectIndex({ projects, status }: Props) {
    return (
        <>
            <Head title="Проекты фотографа" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
                <section className="">
                    <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                                Мои проекты
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                                Список проектов оформлен как файловая система:
                                каждая папка соответствует отдельному альбому
                                или классу.
                            </p>
                        </div>

                        <Button
                            asChild
                            className="rounded-full bg-orange-500 px-6 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
                        >
                            <Link href={createProject()} prefetch>
                                <FolderPlus className="mr-2 h-4 w-4" />
                                Создать проект
                            </Link>
                        </Button>
                    </div>

                    {status && (
                        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {status}
                        </div>
                    )}

                    {projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-18 text-center">
                            <div className="relative mb-5">
                                <FolderArtwork className="w-36 drop-shadow-[0_18px_22px_rgba(245,158,11,0.18)]" />
                            </div>
                            <h2 className="text-2xl font-medium text-white">
                                Каталог пока пуст
                            </h2>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
                                Создайте первую папку проекта. После этого она
                                появится здесь в общем каталоге.
                            </p>
                            <Button
                                asChild
                                className="mt-6 rounded-full bg-orange-500 px-6 text-white hover:bg-orange-600"
                            >
                                <Link href={createProject()} prefetch>
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    Создать первую папку
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                            {projects.map((project) => (
                                <ProjectFolderCard
                                    key={project.id}
                                    project={project}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

function ProjectFolderCard({ project }: { project: ProjectListItem }) {
    return (
        <Link
            href={showProject(project.id)}
            prefetch
            className="group flex flex-col items-center text-center"
        >
            <article className="w-full max-w-[190px] rounded-[1.75rem] border border-transparent px-3 py-3 transition-all duration-200">
                <div className="relative mx-auto w-full max-w-[168px] transition-transform duration-200 group-hover:-translate-y-1">
                    <FolderArtwork className="w-full drop-shadow-[0_12px_18px_rgba(245,158,11,0.18)]" />
                    <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/90 opacity-0 transition group-hover:opacity-100">
                        <FolderOpen className="h-4 w-4" />
                    </div>
                </div>

                <div className="mt-4 flex w-full flex-col items-center gap-3">
                    <h2 className="line-clamp-2 text-base font-medium leading-tight text-white">
                        {project.name}
                    </h2>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Badge
                            variant="outline"
                            className="border-white/10 bg-white/5 text-zinc-200"
                        >
                            {project.className}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="border-orange-500/20 bg-orange-500/10 text-orange-200"
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
            <div className="absolute left-[3%] top-0 h-[27%] w-[36%] rounded-t-[18px] rounded-r-[18px] rounded-b-[8px] bg-[linear-gradient(180deg,#ffbd1f_0%,#eea700_100%)] shadow-[0_3px_0_rgba(133,83,0,0.16)]" />
            <div className="absolute right-0 top-[9%] h-[82%] w-full rounded-[18px] bg-[linear-gradient(180deg,#ffe79a_0%,#ffd667_52%,#f1b82d_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_4px_10px_rgba(0,0,0,0.16)]" />
            <div className="absolute inset-x-[2%] top-[13%] h-[10%] rounded-full bg-white/28 blur-sm" />
            <div className="absolute bottom-[10%] left-[10%] h-[18%] w-[58%] rounded-full bg-black/8 blur-xl" />
        </div>
    );
}

ProjectIndex.layout = {
    breadcrumbs: [
        {
            title: 'Проекты',
            href: projectIndex(),
        },
    ],
};
