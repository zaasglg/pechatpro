import { Form, Head, setLayoutProps } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Spinner } from '@/components/ui/spinner';
import { useTranslations } from '@/hooks/use-translations';
import { register } from '@/routes';
import { store } from '@/routes/login';

type Props = {
    status?: string;
    canRegister: boolean;
};

export default function Login({ status, canRegister }: Props) {
    const { t } = useTranslations();

    setLayoutProps({
        title: t('auth.login.layout_title'),
        description: t('auth.login.layout_description'),
    });

    return (
        <>
            <Head title={t('auth.login.meta_title')} />

            <Form
                action={store()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="phone"
                                    className="text-zinc-300"
                                >
                                    {t('auth.login.phone_label')}
                                </Label>
                                <PhoneInput
                                    id="phone"
                                    name="phone"
                                    required
                                    autoComplete="tel"
                                    placeholder={t(
                                        'auth.login.phone_placeholder',
                                    )}
                                    className="border-slate-400/10 bg-slate-950/60 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label
                                        htmlFor="password"
                                        className="text-zinc-300"
                                    >
                                        {t('auth.login.password_label')}
                                    </Label>
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder={t(
                                        'auth.login.password_placeholder',
                                    )}
                                    className="border-slate-400/10 bg-slate-950/60 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    className="border-white/20 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-zinc-300"
                                >
                                    {t('auth.login.remember')}
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 h-11 w-full bg-emerald-500 text-base font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:bg-emerald-600"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                {t('auth.login.submit')}
                            </Button>
                        </div>

                        {canRegister && (
                            <div className="mt-2 text-center text-sm text-zinc-400">
                                {t('auth.login.no_account')}{' '}
                                <TextLink
                                    href={register()}
                                    className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                                >
                                    {t('auth.login.register')}
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-emerald-400">
                    {status}
                </div>
            )}
        </>
    );
}
