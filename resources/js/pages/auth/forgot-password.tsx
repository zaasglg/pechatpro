import { Head, setLayoutProps } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { useTranslations } from '@/hooks/use-translations';
import { login } from '@/routes';

export default function ForgotPassword() {
    const { t } = useTranslations();

    setLayoutProps({
        title: t('auth.forgot.layout_title'),
        description: t('auth.forgot.layout_description'),
    });

    return (
        <>
            <Head title={t('auth.forgot.meta_title')} />

            <div className="space-y-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    {t('auth.forgot.message')}
                </div>

                <div className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>{t('auth.forgot.back_prefix')}</span>
                    <TextLink href={login()}>{t('auth.forgot.back_link')}</TextLink>
                </div>
            </div>
        </>
    );
}
