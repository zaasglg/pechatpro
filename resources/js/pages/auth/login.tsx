import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';

type Props = {
    status?: string;
    canRegister: boolean;
};

export default function Login({ status, canRegister }: Props) {
    return (
        <>
            <Head title="Вход в систему" />

            <Form
                {...store.form()}
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
                                    Номер телефона
                                </Label>
                                <PhoneInput
                                    id="phone"
                                    name="phone"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="tel"
                                    placeholder="+7 701 123 45 67"
                                    className="border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label
                                        htmlFor="password"
                                        className="text-zinc-300"
                                    >
                                        Пароль
                                    </Label>
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Ваш пароль"
                                    className="border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="border-white/20 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-zinc-300"
                                >
                                    Запомнить меня
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 h-11 w-full bg-orange-500 text-base font-medium text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:bg-orange-600"
                                tabIndex={4}
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Войти в систему
                            </Button>
                        </div>

                        {canRegister && (
                            <div className="mt-2 text-center text-sm text-zinc-400">
                                Нет аккаунта?{' '}
                                <TextLink
                                    href={register()}
                                    tabIndex={5}
                                    className="font-medium text-orange-400 transition-colors hover:text-orange-500"
                                >
                                    Зарегистрироваться
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-500">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Добро пожаловать',
    description:
        'Войдите в систему по номеру телефона для управления вашими заказами',
};
