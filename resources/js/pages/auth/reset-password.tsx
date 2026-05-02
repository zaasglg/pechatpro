import { Head, setLayoutProps } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { useTranslations } from '@/hooks/use-translations';
import { login } from '@/routes';

export default function ResetPassword() {
    const { t } = useTranslations();

    setLayoutProps({
        title: t('auth.reset.layout_title'),
        description: t('auth.reset.layout_description'),
    });

    return (
        <>
            <Head title={t('auth.reset.meta_title')} />

            <div className="space-y-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    {t('auth.reset.message')}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    <TextLink href={login()}>{t('auth.reset.back_link')}</TextLink>
                </div>
            </div>
        </>
    );
}
