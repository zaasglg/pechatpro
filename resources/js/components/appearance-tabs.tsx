import type { HTMLAttributes } from 'react';

export default function AppearanceToggleTab({
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className="hidden" />;
}
