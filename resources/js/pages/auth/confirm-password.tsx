import { Form, Head, setLayoutProps } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslations } from '@/hooks/use-translations';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    const { t } = useTranslations();

    setLayoutProps({
        title: t('auth.confirm.layout_title'),
        description: t('auth.confirm.layout_description'),
    });

    return (
        <>
            <Head title={t('auth.confirm.meta_title')} />

            <Form action={store()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('auth.confirm.password_label')}</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder={t('auth.confirm.password_placeholder')}
                                autoComplete="current-password"
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center">
                            <Button
                                className="w-full"
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && <Spinner />}
                                {t('auth.confirm.submit')}
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </>
    );
}
