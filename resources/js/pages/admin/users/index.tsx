import { Head, useForm } from '@inertiajs/react';
import { KeyRound, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';
import {
    index as adminUsersIndex,
    resetPassword,
} from '@/actions/App/Http/Controllers/Admin/UserController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AdminUser = {
    id: number;
    name: string;
    phone: string;
    cityName: string | null;
    roles: string[];
    approvedAt: string | null;
    createdAt: string | null;
};

type Props = {
    users: AdminUser[];
    roles: string[];
    status?: string | null;
};

const registeredAtFormatter = new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
});

type ResetPasswordForm = {
    password: string;
    password_confirmation: string;
};

export default function AdminUsersIndex({ users, roles, status }: Props) {
    const [activeRole, setActiveRole] = useState<string>(roles[0] ?? 'Админ');
    const [targetUser, setTargetUser] = useState<AdminUser | null>(null);

    const usersByRole = useMemo(() => {
        const map = new Map<string, AdminUser[]>();

        for (const role of roles) {
            map.set(role, []);
        }

        for (const user of users) {
            for (const role of user.roles) {
                if (!map.has(role)) {
                    map.set(role, []);
                }
                map.get(role)!.push(user);
            }
        }

        return map;
    }, [roles, users]);

    const resetForm = useForm<ResetPasswordForm>({
        password: '',
        password_confirmation: '',
    });

    const closeDialog = () => {
        setTargetUser(null);
        resetForm.reset();
        resetForm.clearErrors();
    };

    const handleSubmitReset: FormEventHandler = (event) => {
        event.preventDefault();

        if (targetUser === null) {
            return;
        }

        resetForm.post(resetPassword.url(targetUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                closeDialog();
            },
        });
    };

    return (
        <>
            <Head title="Пользователи" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
                <div>
                    <h1 className="mb-2 text-[28px] font-semibold text-white">
                        Пользователи
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-[#A1A1AA]">
                        Управление аккаунтами сотрудников: просмотр по ролям и
                        сброс пароля при необходимости.
                    </p>
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                <Tabs value={activeRole} onValueChange={setActiveRole}>
                    <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-slate-900/60 p-1">
                        {roles.map((role) => {
                            const count = usersByRole.get(role)?.length ?? 0;

                            return (
                                <TabsTrigger
                                    key={role}
                                    value={role}
                                    className="flex items-center gap-2 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-200"
                                >
                                    <span>{role}</span>
                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                                        {count}
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {roles.map((role) => {
                        const roleUsers = usersByRole.get(role) ?? [];

                        return (
                            <TabsContent
                                key={role}
                                value={role}
                                className="mt-4"
                            >
                                <Card className="rounded-2xl border-white/5 bg-slate-900/55 shadow-xl backdrop-blur-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-xl font-medium text-white">
                                            {role}
                                        </CardTitle>
                                        <p className="text-sm text-[#A1A1AA]">
                                            {roleUsers.length === 0
                                                ? 'Нет пользователей с этой ролью.'
                                                : `Всего: ${roleUsers.length}`}
                                        </p>
                                    </CardHeader>

                                    <CardContent className="space-y-3 pt-0">
                                        {roleUsers.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 px-6 py-12 text-center">
                                                <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-zinc-500" />
                                                <p className="text-sm text-zinc-500">
                                                    В этой роли пока нет
                                                    пользователей.
                                                </p>
                                            </div>
                                        ) : (
                                            roleUsers.map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-slate-900/35 p-4 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="flex gap-4">
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                                                            <UserRound className="h-5 w-5" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-base font-medium text-white">
                                                                {user.name}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Phone className="h-3.5 w-3.5" />
                                                                    {user.phone}
                                                                </span>
                                                                {user.cityName && (
                                                                    <span>·</span>
                                                                )}
                                                                {user.cityName && (
                                                                    <span>
                                                                        {
                                                                            user.cityName
                                                                        }
                                                                    </span>
                                                                )}
                                                                {user.createdAt && (
                                                                    <span>·</span>
                                                                )}
                                                                {user.createdAt && (
                                                                    <span>
                                                                        {formatRegistered(
                                                                            user.createdAt,
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {user.roles.length >
                                                                1 && (
                                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                                    {user.roles
                                                                        .filter(
                                                                            (
                                                                                r,
                                                                            ) =>
                                                                                r !==
                                                                                role,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                r,
                                                                            ) => (
                                                                                <Badge
                                                                                    key={
                                                                                        r
                                                                                    }
                                                                                    variant="outline"
                                                                                    className="border-white/10 bg-white/5 text-[10px] text-zinc-300"
                                                                                >
                                                                                    {
                                                                                        r
                                                                                    }
                                                                                </Badge>
                                                                            ),
                                                                        )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 sm:self-center">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                                                            onClick={() =>
                                                                setTargetUser(
                                                                    user,
                                                                )
                                                            }
                                                        >
                                                            <KeyRound className="mr-2 h-4 w-4" />
                                                            Сбросить пароль
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </div>

            <Dialog
                open={targetUser !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeDialog();
                    }
                }}
            >
                <DialogContent className="max-w-md bg-slate-950 text-white">
                    <DialogTitle>
                        Сброс пароля · {targetUser?.name}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Введите новый пароль. Пользователь сможет сразу войти с
                        ним.
                    </DialogDescription>

                    <form
                        onSubmit={handleSubmitReset}
                        className="mt-2 space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="reset-password">Новый пароль</Label>
                            <Input
                                id="reset-password"
                                type="password"
                                autoComplete="new-password"
                                value={resetForm.data.password}
                                onChange={(event) =>
                                    resetForm.setData(
                                        'password',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={resetForm.errors.password}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reset-password-confirmation">
                                Повторите пароль
                            </Label>
                            <Input
                                id="reset-password-confirmation"
                                type="password"
                                autoComplete="new-password"
                                value={resetForm.data.password_confirmation}
                                onChange={(event) =>
                                    resetForm.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                onClick={closeDialog}
                                disabled={resetForm.processing}
                            >
                                Отмена
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-500 text-white hover:bg-emerald-400"
                                disabled={resetForm.processing}
                            >
                                Сохранить
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function formatRegistered(value: string): string {
    try {
        return `с ${registeredAtFormatter.format(new Date(value))}`;
    } catch {
        return '';
    }
}

AdminUsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Пользователи',
            href: adminUsersIndex(),
        },
    ],
};
