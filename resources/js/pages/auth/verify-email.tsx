import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { logout } from '@/routes';

export default function VerifyEmail() {
    return (
        <>
            <Head title="Подтверждение контакта" />

            <div className="space-y-6 text-center">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    Подтверждение электронной почты отключено. Для входа
                    используется номер телефона.
                </div>

                <TextLink href={logout()} className="mx-auto block text-sm">
                    Выйти
                </TextLink>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Подтверждение контакта',
    description:
        'Подтверждение электронной почты больше не используется в приложении',
};
