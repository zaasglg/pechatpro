import { Head, setLayoutProps } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { useTranslations } from '@/hooks/use-translations';
import { logout } from '@/routes';

export default function VerifyEmail() {
    const { t } = useTranslations();

    setLayoutProps({
        title: t('auth.verify.layout_title'),
        description: t('auth.verify.layout_description'),
    });

    return (
        <>
            <Head title={t('auth.verify.meta_title')} />

            <div className="space-y-6 text-center">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    {t('auth.verify.message')}
                </div>

                <TextLink href={logout()} className="mx-auto block text-sm">
                    {t('auth.verify.logout')}
                </TextLink>
            </div>
        </>
    );
}
