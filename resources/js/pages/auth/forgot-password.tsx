import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { login } from '@/routes';

export default function ForgotPassword() {
    return (
        <>
            <Head title="Восстановление пароля" />

            <div className="space-y-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    Восстановление пароля по номеру телефона пока не настроено.
                    Обратитесь к менеджеру, если вам нужно восстановить доступ.
                </div>

                <div className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>Вернуться к</span>
                    <TextLink href={login()}>входу</TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Восстановление пароля',
    description: 'Сброс пароля через номер телефона пока недоступен',
};
