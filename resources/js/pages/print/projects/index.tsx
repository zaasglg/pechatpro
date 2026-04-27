import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import {
    index as printProjectIndex,
    show as showPrintProject,
} from '@/actions/App/Http/Controllers/PrintProjectController';

type ProjectListItem = {
    id: number;
    name: string;
    className: string;
    photographerName: string | null;
    readyWorksCount: number;
    printingReadyAt: string | null;
};

type Props = {
    projects: ProjectListItem[];
    status?: string | null;
};

export default function PrintProjectIndex({ projects, status }: Props) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Печать',
                href: printProjectIndex(),
            },
        ],
    });

    return (
        <>
            <Head title="Проекты печати" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-medium text-white">
                        Проекты для печати
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Проекты, назначенные вам на этап печати.
                    </p>
                </div>

                {status && (
                    <p className="text-sm text-emerald-400">{status}</p>
                )}

                {projects.length === 0 ? (
                    <p className="py-12 text-center text-sm text-zinc-600">
                        Проектов для печати пока нет
                    </p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => {
                            const done = project.printingReadyAt !== null;

                            return (
                                <Link
                                    key={project.id}
                                    href={showPrintProject(project.id)}
                                    prefetch
                                    className="group flex flex-col gap-4 rounded-2xl border border-white/6 bg-slate-900/45 p-5 transition hover:border-white/12 hover:bg-slate-900/70"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                                                {project.className}
                                            </span>
                                            <span className={`rounded-md px-2 py-0.5 text-xs ${done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-zinc-400'}`}>
                                                {done ? 'Готово' : 'В печати'}
                                            </span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-zinc-400" />
                                    </div>

                                    <div>
                                        <p className="font-medium text-white">
                                            {project.name}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {project.photographerName ?? 'Фотограф не указан'}
                                        </p>
                                    </div>

                                    <p className="mt-auto text-xs text-zinc-600">
                                        {project.readyWorksCount} файлов для печати
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
