import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Tabs({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn('flex flex-col gap-2', className)}
            {...props}
        />
    );
}

function TabsList({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
                'glass-control inline-flex h-auto max-w-full items-center gap-2 overflow-x-auto rounded-full p-1 text-zinc-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                className,
            )}
            {...props}
        />
    );
}

function TabsTrigger({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full border border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap text-zinc-300 transition-[color,box-shadow,background-color,border-color] outline-none hover:bg-white/[0.07] hover:text-white focus-visible:ring-[3px] focus-visible:ring-emerald-500/30 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-emerald-400/20 data-[state=active]:bg-emerald-400/12 data-[state=active]:text-emerald-100 data-[state=active]:shadow-[0_8px_24px_rgba(16,185,129,0.08)] [&_svg]:pointer-events-none [&_svg]:shrink-0',
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn('flex-1 outline-none', className)}
            {...props}
        />
    );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
