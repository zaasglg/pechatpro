import Heading from '@/components/heading';

export default function DeleteUser() {
    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title="Удаление аккаунта"
                description="Удаление аккаунта временно недоступно в текущей версии личного кабинета."
            />
            <div className="rounded-lg border border-red-200/20 bg-red-500/5 p-4 text-sm text-zinc-300">
                Если вам нужно удалить аккаунт, обратитесь к менеджеру. Мы
                обработаем запрос вручную и подтвердим удаление отдельно.
            </div>
        </div>
    );
}
