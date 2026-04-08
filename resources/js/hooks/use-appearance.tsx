import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'dark';
export type Appearance = 'dark';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
const currentAppearance: Appearance = 'dark';

const applyTheme = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    applyTheme();
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'dark',
    );

    const resolvedAppearance: ResolvedAppearance = 'dark';

    const updateAppearance = (): void => {
        applyTheme();
        notify();
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
