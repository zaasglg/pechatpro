import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { login } from '@/routes';

export default function ResetPassword() {
    return (
        <>
            <Head title="Сброс пароля" />

            <div className="space-y-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    Сброс пароля через номер телефона пока не доступен в
                    приложении. Свяжитесь с менеджером, если вам нужно
                    восстановить доступ.
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    <TextLink href={login()}>Вернуться ко входу</TextLink>
                </div>
            </div>
        </>
    );
}

ResetPassword.layout = {
    title: 'Сброс пароля',
    description: 'Сброс пароля через номер телефона пока недоступен',
};
