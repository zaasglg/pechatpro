import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';

type ToastLevel = 'success' | 'error' | 'info' | 'warning';

type FlashToast = {
    message: string;
    type?: ToastLevel;
};

type PageProps = {
    flash?: {
        toast?: FlashToast | null;
    };
};

export default function AppToaster() {
    const page = usePage<PageProps>();
    const lastToastKeyRef = useRef<string | null>(null);
    const flashToast = page.props.flash?.toast;

    useEffect(() => {
        if (!flashToast?.message) {
            return;
        }

        const toastKey = `${flashToast.type ?? 'success'}:${flashToast.message}`;

        if (lastToastKeyRef.current === toastKey) {
            return;
        }

        lastToastKeyRef.current = toastKey;

        switch (flashToast.type) {
            case 'error':
                toast.error(flashToast.message);
                break;
            case 'warning':
                toast.warning(flashToast.message);
                break;
            case 'info':
                toast.info(flashToast.message);
                break;
            default:
                toast.success(flashToast.message);
                break;
        }
    }, [flashToast]);

    return (
        <Toaster
            position="top-center"
            richColors
            theme="dark"
            closeButton
            toastOptions={{
                className: 'border border-white/10 bg-slate-950 text-white',
            }}
        />
    );
}
