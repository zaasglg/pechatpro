import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Images,
    Trash2,
} from 'lucide-react';
import { destroy as destroyProject, index as projectIndex, show as showProject } from '@/actions/App/Http/Controllers/PhotographerProjectController';
import { show as showProjectSourceImages } from '@/actions/App/Http/Controllers/ProjectSourceImageController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type ProjectDetails = {
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
    updatedAt: string | null;
};

type ProjectStage = {
    id: number;
    name: string;
    displayName: string;
    slug: string;
    status: string;
    assignedUsers: Array<{
        id: number;
        name: string;
    }>;
};

type Props = {
    project: ProjectDetails;
    stages: ProjectStage[];
};

export default function ProjectShow({ project, stages }: Props) {
    const deleteForm = useForm<Record<string, never>>({});

    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Проекты',
                href: projectIndex(),
            },
            {
                title: project.name,
                href: showProject(project.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Проект: ${project.name}`} />

            <div className="mx-auto flex w-full flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={projectIndex()}
                        prefetch
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Назад к списку проектов
                    </Link>

                    <div className="flex flex-wrap items-center gap-3">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="rounded-full border-rose-500/20 bg-rose-500/10 px-5 text-rose-200 hover:bg-rose-500/15"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить проект
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="border border-white/10 bg-[#090909] text-white shadow-2xl sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-semibold text-white">
                                        Удалить проект
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Проект <span className="font-medium text-white">{project.name}</span> будет удален вместе с исходниками,
                                        этапами и готовыми работами. Это действие нельзя отменить.
                                    </DialogDescription>
                                </DialogHeader>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                        >
                                            Отмена
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="button"
                                        disabled={deleteForm.processing}
                                        className="bg-rose-500 text-white hover:bg-rose-600"
                                        onClick={() => {
                                            deleteForm.delete(destroyProject.url(project.id), {
                                                preserveScroll: true,
                                            });
                                        }}
                                    >
                                        Удалить навсегда
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button
                            asChild
                            className="rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600"
                        >
                            <Link href={showProjectSourceImages(project.id)} prefetch>
                                <Images className="mr-2 h-4 w-4" />
                                Исходники
                            </Link>
                        </Button>
                    </div>
                </div>

                <section>
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

                    <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                        {project.name}
                    </h1>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <SpecRow label="Класс" value={project.className} />
                        <SpecRow
                            label="Тип альбома"
                            value={project.albumType}
                        />
                        <SpecRow label="Размер" value={project.albumSize} />
                        <SpecRow label="Обложка" value={project.coverType} />
                        <SpecRow
                            label="Страницы"
                            value={`${project.pageCount}`}
                        />
                        <SpecRow
                            label="Ученики"
                            value={`${project.studentCount}`}
                        />
                        <SpecRow
                            label="Печать"
                            value={`${project.printQuantity} шт.`}
                        />
                    </div>

                    <div className="mt-8 border-t border-white/6 pt-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-medium text-zinc-300">
                                Этапы реализации
                            </h2>
                            <span className="text-xs text-zinc-500">
                                {stages.length} этапов
                            </span>
                        </div>

                        <div className="mt-5 rounded-[1.75rem] border border-white/6 bg-white/[0.02] px-5 py-5 md:px-6">
                            <div className="relative">
                                <div className="absolute bottom-3 left-[0.45rem] top-3 w-px bg-white/8" />

                                <div className="space-y-6">
                                    {stages.map((stage) => (
                                        <div
                                            key={stage.id}
                                            className="relative flex items-start justify-between gap-4"
                                        >
                                            <div className="flex min-w-0 items-start gap-4">
                                                <span
                                                    className={`relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-4 border-[#0b0b0b] ${stageStatusDotClassName(stage.status)}`}
                                                />

                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-white md:text-base">
                                                        {stage.displayName}
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                                                        {stage.assignedUsers.length > 0
                                                            ? `Ответственный: ${stage.assignedUsers.map((user) => user.name).join(', ')}`
                                                            : stage.status === 'completed'
                                                              ? 'Этап завершён и готов к передаче дальше'
                                                              : stage.status === 'in_progress'
                                                                ? 'Команда приступит к этапу в ближайшее время'
                                                                : 'Этап запланирован, исполнитель появится позже'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 pt-0.5">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${stageStatusBadgeClassName(stage.status)}`}
                                                >
                                                    {formatStageStatus(stage.status)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

function SpecRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1.25rem] border border-white/6 bg-white/[0.03] p-4">
            <p className="text-xs text-zinc-500">
                {label}
            </p>
            <p className="mt-2 text-base font-black text-zinc-100">{value}</p>
        </div>
    );
}

function formatStageStatus(status: string): string {
    if (status === 'in_progress') {
        return 'Активный этап';
    }

    if (status === 'completed') {
        return 'Завершён';
    }

    return 'Запланирован';
}

function stageStatusBadgeClassName(status: string): string {
    if (status === 'in_progress') {
        return 'bg-orange-500/10 text-orange-200';
    }

    if (status === 'completed') {
        return 'bg-emerald-500/10 text-emerald-200';
    }

    return 'bg-white/5 text-zinc-400';
}

function stageStatusDotClassName(status: string): string {
    if (status === 'in_progress') {
        return 'bg-orange-400';
    }

    if (status === 'completed') {
        return 'bg-emerald-400';
    }

    return 'bg-zinc-600';
}
