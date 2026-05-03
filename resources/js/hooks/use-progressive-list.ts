import { useEffect, useRef, useState } from 'react';

type ProgressiveListOptions = {
    initialCount?: number;
    incrementBy?: number;
    rootMargin?: string;
};

export function useProgressiveList<T>(
    items: T[],
    {
        initialCount = 40,
        incrementBy = 40,
        rootMargin = '900px',
    }: ProgressiveListOptions = {},
) {
    const [visibleCount, setVisibleCount] = useState(() =>
        Math.min(items.length, initialCount),
    );
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setVisibleCount(Math.min(items.length, initialCount));
    }, [initialCount, items.length]);

    useEffect(() => {
        const sentinel = sentinelRef.current;

        if (!sentinel || visibleCount >= items.length) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }

                setVisibleCount((current) =>
                    Math.min(items.length, current + incrementBy),
                );
            },
            { rootMargin },
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [incrementBy, items.length, rootMargin, visibleCount]);

    return {
        hasMore: visibleCount < items.length,
        sentinelRef,
        visibleItems: items.slice(0, visibleCount),
    };
}
