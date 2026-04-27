import { CheckCircle2, Clock3, TimerOff } from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import { getClientSelectionDeadlineState } from '@/lib/client-selection-deadline';
import { cn } from '@/lib/utils';

type Props = {
    deadlineAt: string | null;
    submittedAt?: string | null;
    className?: string;
    variant?: 'default' | 'minimal';
};

export default function ClientSelectionDeadlinePanel({
    deadlineAt,
    submittedAt = null,
    className,
    variant = 'default',
}: Props) {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (!deadlineAt || submittedAt) {
            return;
        }

        const intervalId = window.setInterval(() => {
            startTransition(() => {
                setNowMs(Date.now());
            });
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [deadlineAt, submittedAt]);

    const deadlineState = getClientSelectionDeadlineState(
        deadlineAt,
        submittedAt,
        nowMs,
    );

    if (!deadlineState) {
        return null;
    }

    const stateStyles = {
        active: {
            container: 'border-emerald-400/15 bg-emerald-500/8',
            icon: Clock3,
            iconClassName: 'text-emerald-200',
            eyebrowClassName: 'text-emerald-100/70',
            titleClassName: 'text-white',
            detailClassName: 'text-emerald-100/80',
            remainingClassName:
                'text-2xl font-semibold leading-tight text-white tabular-nums sm:text-3xl md:text-4xl',
            remainingWrapperClassName: 'border-white/8 bg-white/3 text-white',
            remainingLabelClassName: 'text-emerald-100/60',
        },
        expired: {
            container: 'border-rose-400/15 bg-rose-500/8',
            icon: TimerOff,
            iconClassName: 'text-rose-200',
            eyebrowClassName: 'text-rose-100/70',
            titleClassName: 'text-white',
            detailClassName: 'text-rose-100/80',
            remainingClassName: 'text-base font-medium text-white sm:text-lg',
            remainingWrapperClassName: 'border-white/8 bg-white/3 text-white',
            remainingLabelClassName: 'text-rose-100/60',
        },
        submitted: {
            container: 'border-sky-400/15 bg-sky-500/8',
            icon: CheckCircle2,
            iconClassName: 'text-sky-200',
            eyebrowClassName: 'text-sky-100/70',
            titleClassName: 'text-white',
            detailClassName: 'text-sky-100/80',
            remainingClassName: 'text-base font-medium text-white sm:text-lg',
            remainingWrapperClassName: 'border-white/8 bg-white/3 text-white',
            remainingLabelClassName: 'text-sky-100/60',
        },
    }[deadlineState.state];

    const Icon = stateStyles.icon;

    if (variant === 'minimal') {
        return (
            <div
                className={cn(
                    'rounded-[1.25rem] border px-4 py-4 sm:px-5',
                    stateStyles.container,
                    className,
                )}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div
                            className={cn(
                                'inline-flex items-center gap-2 text-[11px] font-medium uppercase',
                                stateStyles.eyebrowClassName,
                            )}
                        >
                            <Icon
                                className={cn(
                                    'h-3.5 w-3.5 shrink-0',
                                    stateStyles.iconClassName,
                                )}
                            />
                            {deadlineState.remaining ? 'До дедлайна' : 'Статус'}
                        </div>

                        <p
                            className={cn(
                                'mt-2 text-sm leading-relaxed sm:text-base',
                                stateStyles.detailClassName,
                            )}
                        >
                            {deadlineState.remaining
                                ? `Выбрать до ${deadlineState.detail}`
                                : deadlineState.detail}
                        </p>
                    </div>

                    <p
                        className={cn(
                            deadlineState.remaining
                                ? 'max-w-[12ch] text-right text-2xl leading-tight font-semibold tabular-nums sm:text-3xl'
                                : 'max-w-[14ch] text-right text-sm leading-snug font-semibold sm:text-base',
                            stateStyles.titleClassName,
                        )}
                    >
                        {deadlineState.remaining
                            ? deadlineState.remaining
                            : deadlineState.label}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-[1.5rem] border px-5 py-5 sm:px-6 sm:py-6',
                stateStyles.container,
                className,
            )}
        >
            <div className="flex flex-col gap-4 sm:gap-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div
                            className={cn(
                                'inline-flex items-center gap-2 text-[11px] font-medium uppercase',
                                stateStyles.eyebrowClassName,
                            )}
                        >
                            <Icon
                                className={cn(
                                    'h-3.5 w-3.5 shrink-0',
                                    stateStyles.iconClassName,
                                )}
                            />
                            {deadlineState.label}
                        </div>

                        <div className="mt-4 space-y-2">
                            <p
                                className={cn(
                                    'text-lg font-semibold leading-tight sm:text-xl',
                                    stateStyles.titleClassName,
                                )}
                            >
                                {deadlineState.label}
                            </p>
                            <p
                                className={cn(
                                    'max-w-xl text-sm leading-relaxed sm:text-base',
                                    stateStyles.detailClassName,
                                )}
                            >
                                {deadlineState.detail}
                            </p>
                        </div>
                    </div>

                    {deadlineState.remaining ? (
                        <div
                            className={cn(
                                'w-full rounded-[1.25rem] border px-4 py-3 md:w-auto md:min-w-[220px] md:px-5 md:py-4',
                                stateStyles.remainingWrapperClassName,
                            )}
                        >
                            <p
                                className={cn(
                                    'text-[11px] font-medium uppercase',
                                    stateStyles.remainingLabelClassName,
                                )}
                            >
                                До дедлайна
                            </p>
                            <p
                                className={cn(
                                    'mt-2 break-words',
                                    stateStyles.remainingClassName,
                                )}
                            >
                                {deadlineState.remaining}
                            </p>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'rounded-[1.25rem] border px-4 py-3 sm:px-5 sm:py-4',
                                stateStyles.remainingWrapperClassName,
                            )}
                        >
                            <p
                                className={cn(
                                    'text-[11px] font-medium  uppercase',
                                    stateStyles.remainingLabelClassName,
                                )}
                            >
                                Статус
                            </p>
                            <p
                                className={cn(
                                    'mt-2 leading-snug',
                                    stateStyles.remainingClassName,
                                )}
                            >
                                {deadlineState.label}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
