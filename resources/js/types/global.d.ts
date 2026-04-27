import type { Auth } from '@/types/auth';
import type { Localization } from '@/types/localization';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            localization: Localization;
            flash?: {
                toast?: {
                    message: string;
                    type?: 'success' | 'error' | 'info' | 'warning';
                } | null;
            };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
