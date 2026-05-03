import {
    CalendarDays,
    ExternalLink,
    FileImage,
    HardDrive,
    ScanSearch,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';

export type ProjectSourceImageViewerItem = {
    name: string;
    url: string;
    previewUrl: string | null;
    sizeBytes: number;
    mimeType: string | null;
    uploadedAt: string | null;
};

type Props = {
    image: ProjectSourceImageViewerItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function ProjectSourceImageViewer({
    image,
    open,
    onOpenChange,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="h-[min(100dvh-0.75rem,960px)] max-w-[calc(100vw-0.75rem)] overflow-hidden border border-white/10 bg-[#05070e]/95 p-0 shadow-2xl sm:h-[min(94vh,960px)] sm:max-w-[min(96vw,1520px)]"
            >
                <DialogClose asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute top-3 right-3 z-20 border-white/20 bg-slate-950/90 text-white hover:bg-slate-900"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Закрыть</span>
                    </Button>
                </DialogClose>

                {image && (
                    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-h-0 bg-black">
                            <div className="flex h-full min-h-0 w-full items-center justify-center p-2 sm:p-5 lg:p-8">
                                <img
                                    src={image.previewUrl ?? image.url}
                                    alt={image.name}
                                    decoding="async"
                                    className="h-auto max-h-full w-auto max-w-full object-contain"
                                />
                            </div>
                        </div>

                        <aside className="flex max-h-[min(44dvh,380px)] min-h-0 flex-col border-t border-white/10 bg-slate-950/92 lg:max-h-none lg:border-t-0 lg:border-l">
                            <div className="border-b border-white/10 px-4 py-3 pr-14 sm:px-5 sm:py-4">
                                <DialogTitle className="text-sm leading-snug break-all text-white sm:text-lg">
                                    {image.name}
                                </DialogTitle>
                                <DialogDescription className="mt-1 text-sm leading-relaxed text-zinc-400">
                                    Подробная информация о выбранном исходнике
                                </DialogDescription>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:space-y-3 sm:px-5 sm:py-5">
                                <ViewerInfoRow
                                    icon={HardDrive}
                                    label="Размер файла"
                                    value={formatBytes(image.sizeBytes)}
                                />
                                <ViewerInfoRow
                                    icon={FileImage}
                                    label="Тип файла"
                                    value={formatFileType(
                                        image.name,
                                        image.mimeType,
                                    )}
                                />
                                <ViewerInfoRow
                                    icon={CalendarDays}
                                    label="Загружен"
                                    value={formatUploadedAt(image.uploadedAt)}
                                />
                                <ViewerInfoRow
                                    icon={ScanSearch}
                                    label="Режим просмотра"
                                    value={
                                        image.previewUrl &&
                                        image.previewUrl !== image.url
                                            ? 'Сгенерированное превью'
                                            : 'Оригинальный файл'
                                    }
                                />
                            </div>

                            <div className="border-t border-white/10 p-4 sm:p-5">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-11 w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                                >
                                    <a
                                        href={image.url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Открыть оригинал
                                    </a>
                                </Button>
                            </div>
                        </aside>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function ViewerInfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof HardDrive;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-white/8 bg-white/4 px-3.5 py-3 sm:px-4">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/6 text-zinc-300">
                    <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-medium text-zinc-500 uppercase sm:text-xs">
                        {label}
                    </p>
                    <p className="mt-1 text-sm font-medium break-words text-white">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

function formatBytes(sizeBytes: number): string {
    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string | null): string {
    if (!value) {
        return 'Дата неизвестна';
    }

    return new Intl.DateTimeFormat('ru-KZ', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatFileType(name: string, mimeType: string | null): string {
    if (mimeType) {
        return mimeType;
    }

    const extension = name.split('.').pop()?.trim();

    if (!extension) {
        return 'Неизвестный тип';
    }

    return `.${extension.toUpperCase()}`;
}
