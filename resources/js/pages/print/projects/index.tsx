import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { CheckCircle2, ExternalLink, ImageIcon, Printer, UserRound } from 'lucide-react';
import { index as printProjectIndex, show as showPrintProject } from '@/actions/App/Http/Controllers/PrintProjectController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        Проекты для печати
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                        Здесь видны только проекты, назначенные вам на этап
                        печати. После завершения отметьте проект как готовый,
                        чтобы вернуть его модератору.
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
                            <div className="flex h-full flex-col gap-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className="border-orange-500/20 bg-orange-500/10 text-orange-200"
                                    >
                                        {project.className}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="border-white/10 bg-white/5 text-zinc-200"
                                    >
                                        {project.printingReadyAt ? 'Готово для модератора' : 'В печати'}
                                    </Badge>
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
                                            {project.readyWorksCount} файлов для печати
                                        </span>
                                        <span className="inline-flex items-center gap-2">
                                            <Printer className="h-4 w-4 text-orange-400" />
                                            {project.printingReadyAt ? 'Печать завершена' : 'Ожидает завершения'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-auto flex justify-end">
                                    <Button
                                        asChild
                                        className="bg-orange-500 text-white hover:bg-orange-600"
                                    >
                                        <Link href={showPrintProject(project.id)} prefetch>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Открыть проект
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {projects.length === 0 && (
                    <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-zinc-300">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-white">
                            Пока нет проектов для печати
                        </h2>
                        <p className="mt-2 text-sm text-zinc-500">
                            Когда модератор назначит вам проект, он появится здесь.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
