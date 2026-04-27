import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input, inputStyles } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Spinner } from '@/components/ui/spinner';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';

type CityOption = {
    id: number;
    name: string;
};

type Props = {
    cities: CityOption[];
    registrationPendingApproval?: boolean;
    registrationPendingApprovalToken?: string | null;
};

export default function Register({
    cities,
    registrationPendingApproval = false,
    registrationPendingApprovalToken = null,
}: Props) {
    const { t } = useTranslations();

    setLayoutProps({
        title: t('auth.register.layout_title'),
        description: t('auth.register.layout_description'),
    });

    return (
        <>
            <Head title={t('auth.register.meta_title')} />
            <Form
                action={store()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-zinc-300">
                                    {t('auth.register.name_label')}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoComplete="name"
                                    name="name"
                                    placeholder={t(
                                        'auth.register.name_placeholder',
                                    )}
                                    className="border-slate-400/10 bg-slate-950/60 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                                />
                                <InputError
                                    message={errors.name}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="phone"
                                    className="text-zinc-300"
                                >
                                    {t('auth.register.phone_label')}
                                </Label>
                                <PhoneInput
                                    id="phone"
                                    required
                                    autoComplete="tel"
                                    name="phone"
                                    placeholder={t(
                                        'auth.register.phone_placeholder',
                                    )}
                                    className="border-slate-400/10 bg-slate-950/60 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                                />
                                <InputError
                                    message={errors.phone}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="instagram_url"
                                    className="text-zinc-300"
                                >
                                    {t('auth.register.instagram_label')}
                                </Label>
                                <Input
                                    id="instagram_url"
                                    type="url"
                                    autoComplete="url"
                                    name="instagram_url"
                                    placeholder={t(
                                        'auth.register.instagram_placeholder',
                                    )}
                                    className="border-slate-400/10 bg-slate-950/60 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                                />
                                <InputError
                                    message={errors.instagram_url}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="city_id"
                                    className="text-zinc-300"
                                >
                                    {t('auth.register.city_label')}
                                </Label>
                                <select
                                    id="city_id"
                                    required
                                    name="city_id"
                                    defaultValue=""
                                    className={cn(
                                        inputStyles,
                                        'border-slate-400/10 bg-slate-950/60 text-white focus-visible:ring-emerald-500',
                                    )}
                                >
                                    <option value="">
                                        {t('auth.register.city_placeholder')}
                                    </option>
                                    {cities.map((city) => (
                                        <option key={city.id} value={city.id}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    message={errors.city_id}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="text-zinc-300"
                                >
                                    {t('auth.register.password_label')}
                                </Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder={t(
                                        'auth.register.password_placeholder',
                                    )}
                                    className="border-slate-400/10 bg-slate-950/60 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                                />
                                <InputError
                                    message={errors.password}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password_confirmation"
                                    className="text-zinc-300"
                                >
                                    {t(
                                        'auth.register.password_confirmation_label',
                                    )}
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder={t(
                                        'auth.register.password_confirmation_placeholder',
                                    )}
                                    className="border-slate-400/10 bg-slate-950/60 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                    className="mt-1"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 h-11 w-full bg-emerald-500 text-base font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:bg-emerald-600"
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                {t('auth.register.submit')}
                            </Button>
                        </div>

                        <div className="mt-1 text-center text-sm text-zinc-400">
                            {t('auth.register.has_account')}{' '}
                            <TextLink
                                href={login()}
                                className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                            >
                                {t('auth.register.login')}
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

            {registrationPendingApproval &&
                registrationPendingApprovalToken && (
                    <RegistrationPendingApprovalModal
                        key={registrationPendingApprovalToken}
                        title={t('auth.register.pending_title')}
                        description={t('auth.register.pending_description')}
                        closeLabel={t('auth.register.pending_close')}
                    />
                )}
        </>
    );
}

function RegistrationPendingApprovalModal({
    title,
    description,
    closeLabel,
}: {
    title: string;
    description: string;
    closeLabel: string;
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="border border-emerald-500/20 bg-[#111827] text-white shadow-2xl sm:max-w-lg">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-2xl font-semibold text-white">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-base leading-relaxed text-zinc-400">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="sm:justify-center">
                    <Button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                        {closeLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
