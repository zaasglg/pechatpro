import { useEffect, useState } from 'react';

type ProgressiveListOptions = {
    initialCount?: number;
    incrementBy?: number;
};

export function useProgressiveList<T>(
    items: T[],
    {
        initialCount = 50,
        incrementBy = 50,
    }: ProgressiveListOptions = {},
) {
    const [visibleCount, setVisibleCount] = useState(() =>
        Math.min(items.length, initialCount),
    );

    useEffect(() => {
        setVisibleCount(Math.min(items.length, initialCount));
    }, [initialCount, items.length]);

    const loadMore = () => {
        setVisibleCount((current) =>
            Math.min(items.length, current + incrementBy),
        );
    };

    return {
        hasMore: visibleCount < items.length,
        loadMore,
        remainingCount: Math.max(0, items.length - visibleCount),
        visibleItems: items.slice(0, visibleCount),
    };
}
