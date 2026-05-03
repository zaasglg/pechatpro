import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    complete as completePrintProject,
    index as printProjectIndex,
    show as showPrintProject,
} from '@/actions/App/Http/Controllers/PrintProjectController';
import {
    printArchive as downloadPrintArchive,
    printDownload as downloadPrintWork,
} from '@/actions/App/Http/Controllers/ProjectMontageDownloadController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useProgressiveList } from '@/hooks/use-progressive-list';

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
    previewUrl: string | null;
    mimeType: string | null;
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

export default function PrintProjectShow({
    project,
    readyWorks,
    status,
}: Props) {
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
    const {
        hasMore: hasMoreReadyWorks,
        sentinelRef: readyWorksSentinelRef,
        visibleItems: visibleReadyWorks,
    } = useProgressiveList(readyWorks, {
        initialCount: 48,
        incrementBy: 48,
    });

    return (
        <>
            <Head title={`Печать | ${project.name}`} />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={printProjectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад
                    </Link>

                    <div className="flex flex-wrap gap-3">
                        {readyWorks.length > 0 && (
                            <Button
                                asChild
                                type="button"
                                variant="outline"
                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                            >
                                <a href={downloadPrintArchive.url(project.id)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Скачать архив
                                </a>
                            </Button>
                        )}

                        <Button
                            type="button"
                            disabled={
                                completeForm.processing ||
                                readyWorks.length === 0 ||
                                project.printingReadyAt !== null
                            }
                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                            onClick={() => {
                                completeForm.post(
                                    completePrintProject.url(project.id),
                                    {
                                        preserveScroll: true,
                                    },
                                );
                            }}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {project.printingReadyAt
                                ? 'Печать уже завершена'
                                : 'Печать готова'}
                        </Button>
                    </div>
                </div>

                <section>
                    <div className="flex flex-col gap-4 border-b border-white/6 pb-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant="outline"
                                className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
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
                                <h1 className="text-3xl font-semibold text-white">
                                    {project.name}
                                </h1>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Фотограф:{' '}
                                    {project.photographerName ?? 'Не указан'}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Этап:{' '}
                                    {project.currentStageName ?? 'Неизвестно'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/6 bg-slate-900/45 px-4 py-3 text-sm text-zinc-300">
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

                    <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                        {visibleReadyWorks.map((work) => (
                            <button
                                key={work.id}
                                type="button"
                                className="group overflow-hidden rounded-xl border border-white/6 bg-slate-900/45 text-left transition hover:border-emerald-500/40 hover:bg-slate-900/60"
                                style={{
                                    contentVisibility: 'auto',
                                    containIntrinsicSize: '170px',
                                }}
                                onClick={() => setActiveWorkId(work.id)}
                            >
                                <div className="aspect-square overflow-hidden bg-black/40">
                                    {work.previewUrl ? (
                                        <img
                                            src={work.previewUrl}
                                            alt={work.name}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover transition group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                            {(work.name.split('.').pop() ?? '').toUpperCase() || 'FILE'}
                                        </div>
                                    )}
                                </div>
                                <div className="px-2 py-1.5">
                                    <p className="truncate text-[11px] text-zinc-300">
                                        {work.name}
                                    </p>
                                    <p className="text-[10px] text-zinc-600">
                                        {formatFileSize(work.sizeBytes)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                    {hasMoreReadyWorks && (
                        <div
                            ref={readyWorksSentinelRef}
                            className="h-10"
                            aria-hidden="true"
                        />
                    )}
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
                <DialogContent className="max-w-5xl border-white/10 bg-slate-950 text-white">
                    {activeWork && (
                        <>
                            <DialogTitle>{activeWork.name}</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Просмотр файла перед печатью.
                            </DialogDescription>

                            <div className="mt-2 flex max-h-[78vh] items-center justify-center overflow-hidden rounded-2xl bg-black/40 p-4">
                                {activeWork.previewUrl ? (
                                    <img
                                        src={activeWork.previewUrl}
                                        alt={activeWork.name}
                                        decoding="async"
                                        className="h-auto max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
                                    />
                                ) : (
                                    <div className="flex h-72 w-full items-center justify-center text-sm text-zinc-400">
                                        Превью недоступно для этого формата.
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    asChild
                                    type="button"
                                    variant="outline"
                                    className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                >
                                    <a
                                        href={downloadPrintWork.url([
                                            project.id,
                                            activeWork.id,
                                        ])}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Скачать файл
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
