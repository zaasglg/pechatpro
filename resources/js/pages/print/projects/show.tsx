import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { complete as completePrintProject, index as printProjectIndex, show as showPrintProject } from '@/actions/App/Http/Controllers/PrintProjectController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

type ProjectSummary = {
    id: number;
    name: string;
    className: string;
    albumType: string;
    albumSize: string;
    photographerName: string | null;
    currentStageName: string | null;
    printingReadyAt: string | null;
};

type ReadyWork = {
    id: number;
    name: string;
    url: string;
    sizeBytes: number;
};

type Props = {
    project: ProjectSummary;
    readyWorks: ReadyWork[];
    status?: string | null;
};

function formatFileSize(sizeBytes: number): string {
    if (sizeBytes >= 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
    }

    return `${Math.max(1, Math.round(sizeBytes / 1024))} КБ`;
}

export default function PrintProjectShow({ project, readyWorks, status }: Props) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Печать',
                href: printProjectIndex(),
            },
            {
                title: project.name,
                href: showPrintProject(project.id),
            },
        ],
    });

    const completeForm = useForm<Record<string, never>>({});
    const [activeWorkId, setActiveWorkId] = useState<number | null>(null);
    const activeWork = useMemo(
        () => readyWorks.find((work) => work.id === activeWorkId) ?? null,
        [activeWorkId, readyWorks],
    );

    return (
        <>
            <Head title={`Печать | ${project.name}`} />

            <div className="flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={printProjectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад
                    </Link>

                    <Button
                        type="button"
                        disabled={completeForm.processing || readyWorks.length === 0 || project.printingReadyAt !== null}
                        className="bg-orange-500 text-white hover:bg-orange-600"
                        onClick={() => {
                            completeForm.post(completePrintProject.url(project.id), {
                                preserveScroll: true,
                            });
                        }}
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {project.printingReadyAt ? 'Печать уже завершена' : 'Печать готова'}
                    </Button>
                </div>

                <section>
                    <div className="flex flex-col gap-4 border-b border-white/6 pb-5">
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
                                {project.albumType}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="border-white/10 bg-white/5 text-zinc-200"
                            >
                                {project.albumSize}
                            </Badge>
                        </div>

                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-semibold tracking-tight text-white">
                                    {project.name}
                                </h1>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Фотограф: {project.photographerName ?? 'Не указан'}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Этап: {project.currentStageName ?? 'Неизвестно'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                                {project.printingReadyAt
                                    ? 'Проект уже возвращен модератору как готовый к печати'
                                    : 'После завершения нажмите «Печать готова», чтобы вернуть проект модератору'}
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {status}
                        </div>
                    )}

                    {completeForm.errors.project && (
                        <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {completeForm.errors.project}
                        </div>
                    )}

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {readyWorks.map((work) => (
                            <button
                                key={work.id}
                                type="button"
                                className="overflow-hidden rounded-[1.5rem] border border-white/6 bg-white/[0.03] text-left transition hover:border-orange-500/40 hover:bg-white/[0.05]"
                                onClick={() => setActiveWorkId(work.id)}
                            >
                                <div className="aspect-[4/3] overflow-hidden bg-black/40">
                                    <img
                                        src={work.url}
                                        alt={work.name}
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div className="space-y-2 px-4 py-4">
                                    <p className="line-clamp-2 text-lg text-white">
                                        {work.name}
                                    </p>
                                    <p className="text-sm text-zinc-500">
                                        {formatFileSize(work.sizeBytes)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            <Dialog
                open={activeWork !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveWorkId(null);
                    }
                }}
            >
                <DialogContent className="max-w-5xl border-white/10 bg-zinc-950 text-white">
                    {activeWork && (
                        <>
                            <DialogTitle>{activeWork.name}</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Просмотр файла перед печатью.
                            </DialogDescription>

                            <div className="mt-2 flex max-h-[78vh] items-center justify-center overflow-hidden rounded-2xl bg-black/40 p-4">
                                <img
                                    src={activeWork.url}
                                    alt={activeWork.name}
                                    className="h-auto max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
                                />
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
