type ClientSelectionDeadlineState = {
    state: 'active' | 'expired' | 'submitted';
    label: string;
    detail: string;
    remaining?: string;
};

const deadlineFormatter = new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

export function formatClientSelectionDeadline(value: string): string {
    return deadlineFormatter.format(new Date(value));
}

export function toDateTimeLocalValue(value: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000,
    );

    return localDate.toISOString().slice(0, 16);
}

export function currentDateTimeLocalValue(): string {
    const date = new Date(Date.now() + 60_000);

    date.setSeconds(0, 0);

    return toDateTimeLocalValue(date.toISOString());
}

export function getClientSelectionDeadlineState(
    deadlineAt: string | null,
    submittedAt: string | null,
    nowMs: number = Date.now(),
): ClientSelectionDeadlineState | null {
    if (!deadlineAt) {
        return null;
    }

    const deadlineDate = new Date(deadlineAt);
    const deadlineMs = deadlineDate.getTime();

    if (Number.isNaN(deadlineMs)) {
        return null;
    }

    const formattedDeadline = formatClientSelectionDeadline(deadlineAt);

    if (submittedAt) {
        return {
            state: 'submitted',
            label: 'Выбор отправлен',
            detail: `Дедлайн был до ${formattedDeadline}`,
        };
    }

    if (deadlineMs <= nowMs) {
        return {
            state: 'expired',
            label: 'Срок выбора истек',
            detail: `Дедлайн был до ${formattedDeadline}`,
        };
    }

    return {
        state: 'active',
        label: 'Выбрать до',
        detail: formattedDeadline,
        remaining: formatRemainingTime(deadlineMs - nowMs),
    };
}

export function isClientSelectionDeadlineExpired(
    deadlineAt: string | null,
): boolean {
    if (!deadlineAt) {
        return false;
    }

    return new Date(deadlineAt).getTime() <= Date.now();
}

function formatRemainingTime(remainingMs: number): string {
    const totalMinutes = Math.max(0, Math.floor(remainingMs / 60_000));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
        if (hours === 0) {
            return `${days} ${pluralize(days, ['день', 'дня', 'дней'])}`;
        }

        return `${days} ${pluralize(days, ['день', 'дня', 'дней'])} ${hours} ч`;
    }

    if (hours > 0) {
        if (minutes === 0) {
            return `${hours} ч`;
        }

        return `${hours} ч ${minutes} мин`;
    }

    if (minutes <= 1) {
        return 'меньше минуты';
    }

    return `${minutes} ${pluralize(minutes, ['минута', 'минуты', 'минут'])}`;
}

function pluralize(value: number, forms: [string, string, string]): string {
    const mod10 = value % 10;
    const mod100 = value % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return forms[0];
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return forms[1];
    }

    return forms[2];
}
