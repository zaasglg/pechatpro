import { Form, Head } from '@inertiajs/react';
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
    return (
        <>
            <Head title="Регистрация фотографа" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-zinc-300">
                                    Имя и фамилия
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Иван Иванов"
                                    className="border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
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
                                    Номер телефона
                                </Label>
                                <PhoneInput
                                    id="phone"
                                    required
                                    autoComplete="tel"
                                    name="phone"
                                    placeholder="+7 701 123 45 67"
                                    className="border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
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
                                    Ссылка на Instagram
                                </Label>
                                <Input
                                    id="instagram_url"
                                    type="url"
                                    required
                                    autoComplete="url"
                                    name="instagram_url"
                                    placeholder="https://instagram.com/vash_profil"
                                    className="border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                                />
                                <InputError
                                    message={errors.instagram_url}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="city_id" className="text-zinc-300">
                                    Город
                                </Label>
                                <select
                                    id="city_id"
                                    required
                                    name="city_id"
                                    defaultValue=""
                                    className={cn(
                                        inputStyles,
                                        'border-white/10 bg-zinc-950/50 text-white focus-visible:ring-orange-500',
                                    )}
                                >
                                    <option value="">Выберите город</option>
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
                                    Пароль
                                </Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Минимум 8 символов"
                                    className="border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
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
                                    Подтверждение пароля
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Повторите пароль"
                                    className="border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                    className="mt-1"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full bg-orange-500 text-base font-medium text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:bg-orange-600"
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Начать сотрудничество
                            </Button>
                        </div>

                        <div className="mt-2 text-center text-sm text-zinc-400">
                            Уже есть аккаунт?{' '}
                            <TextLink
                                href={login()}
                                className="font-medium text-orange-400 transition-colors hover:text-orange-500"
                            >
                                Войти
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

            {registrationPendingApproval && registrationPendingApprovalToken && (
                <RegistrationPendingApprovalModal
                    key={registrationPendingApprovalToken}
                />
            )}
        </>
    );
}

function RegistrationPendingApprovalModal() {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="border border-orange-500/20 bg-[#090909] text-white shadow-2xl sm:max-w-lg">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-2xl font-semibold text-white">
                        Заявка отправлена
                    </DialogTitle>
                    <DialogDescription className="text-base leading-relaxed text-zinc-400">
                        Ждите подтверждения аккаунта. Мы свяжемся с вами после
                        проверки и сообщим, когда вход в систему станет
                        доступен.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="sm:justify-center">
                    <Button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="bg-orange-500 text-white hover:bg-orange-600"
                    >
                        Понятно
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

Register.layout = {
    title: 'Регистрация',
    description:
        'Создайте аккаунт, укажите телефон, Instagram и город, чтобы начать сотрудничество',
};
