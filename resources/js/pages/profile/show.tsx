import { Head, useForm } from '@inertiajs/react';
import { Calendar, Camera, Link2, Lock, MapPin, Phone, Upload, UserRound } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent } from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { update as updateProfileInformation, updateAvatar, updatePassword as updateProfilePassword } from '@/actions/App/Http/Controllers/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { show as profileShow } from '@/routes/profile';
import type { User } from '@/types';

type ProfileAvatarForm = {
    avatar: File | null;
};

type ProfileInformationForm = {
    city_id: string;
    name: string;
    phone: string;
    instagram_url: string;
};

type CityOption = {
    id: number;
    name: string;
};

type ProfilePasswordForm = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

export default function ProfileShow({
    cities,
    user,
    status,
}: {
    cities: CityOption[];
    user: User;
    status?: string | null;
}) {
    const stats = {
        totalOrders: 142,
        activeOrders: 12,
        completed: 130,
    };

    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
    const avatarPreviewUrlRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const informationForm = useForm<ProfileInformationForm>({
        city_id: user.city_id ? String(user.city_id) : '',
        name: user.name,
        phone: user.phone,
        instagram_url: user.instagram_url ?? '',
    });
    const passwordForm = useForm<ProfilePasswordForm>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const {
        data,
        setData,
        post,
        processing,
        progress,
        errors,
        reset,
        clearErrors,
    } = useForm<ProfileAvatarForm>({
        avatar: null,
    });

    const initials = user.name.slice(0, 2).toUpperCase();
    const avatarSource =
        user.avatar ??
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=f97316`;

    const syncProfileInformation = useEffectEvent(() => {
        informationForm.setData({
            city_id: user.city_id ? String(user.city_id) : '',
            name: user.name,
            phone: user.phone,
            instagram_url: user.instagram_url ?? '',
        });
    });

    useEffect(() => {
        syncProfileInformation();
    }, [user.city_id, user.instagram_url, user.name, user.phone]);

    useEffect(() => {
        return () => {
            if (avatarPreviewUrlRef.current) {
                URL.revokeObjectURL(avatarPreviewUrlRef.current);
            }
        };
    }, []);

    const replaceAvatarPreview = (file: File | null) => {
        if (avatarPreviewUrlRef.current) {
            URL.revokeObjectURL(avatarPreviewUrlRef.current);
        }

        const nextPreviewUrl = file ? URL.createObjectURL(file) : null;
        avatarPreviewUrlRef.current = nextPreviewUrl;
        setAvatarPreviewUrl(nextPreviewUrl);
    };

    const resetAvatarForm = () => {
        replaceAvatarPreview(null);
        reset();
        clearErrors();

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAvatarSelection = (event: ChangeEvent<HTMLInputElement>) => {
        const avatarFile = event.target.files?.[0] ?? null;

        replaceAvatarPreview(avatarFile);
        setData('avatar', avatarFile);
    };

    const openAvatarPicker = () => {
        if (processing) {
            return;
        }

        fileInputRef.current?.click();
    };

    const selectAvatarFile = (avatarFile: File | null) => {
        replaceAvatarPreview(avatarFile);
        setData('avatar', avatarFile);
        setIsDraggingAvatar(false);
    };

    const handleAvatarDrop = (event: DragEvent<HTMLDivElement>) => {
        if (processing) {
            return;
        }

        event.preventDefault();
        selectAvatarFile(event.dataTransfer.files?.[0] ?? null);
    };

    const handleAvatarDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        openAvatarPicker();
    };

    const handleAvatarDialogChange = (open: boolean) => {
        setIsAvatarDialogOpen(open);

        if (!open && !processing) {
            resetAvatarForm();
        }
    };

    const handleProfileDialogChange = (open: boolean) => {
        setIsProfileDialogOpen(open);

        if (!open && !informationForm.processing) {
            informationForm.setData({
                city_id: user.city_id ? String(user.city_id) : '',
                name: user.name,
                phone: user.phone,
                instagram_url: user.instagram_url ?? '',
            });
            informationForm.clearErrors();
        }
    };

    const handlePasswordDialogChange = (open: boolean) => {
        setIsPasswordDialogOpen(open);

        if (!open && !passwordForm.processing) {
            passwordForm.reset();
            passwordForm.clearErrors();
        }
    };

    const submitAvatar = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!data.avatar) {
            return;
        }

        post(updateAvatar.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                resetAvatarForm();
                setIsAvatarDialogOpen(false);
            },
        });
    };

    return (
        <>
            <Head title={`Профиль | ${user.name}`} />
            <div className="flex w-full flex-col">
                <div className="group relative h-[180px] w-full overflow-hidden border-b border-white/5 bg-gradient-to-r from-zinc-900 via-zinc-950 to-black sm:h-[220px]">
                    <div className="absolute inset-0 bg-orange-500/5 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                </div>

                <div className="relative mx-auto -mt-16 w-full max-w-6xl px-4 pb-12 sm:-mt-24 sm:px-6">
                    <div className="mb-6 flex flex-col items-start gap-4">
                        <Dialog
                            open={isAvatarDialogOpen}
                            onOpenChange={handleAvatarDialogChange}
                        >
                            <div className="relative inline-block">
                                <DialogTrigger asChild>
                                    <button
                                        type="button"
                                        className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                        aria-label="Изменить аватар"
                                    >
                                        <Avatar className="h-32 w-32 rounded-full border-4 border-black bg-[#0a0a0a] shadow-2xl sm:h-40 sm:w-40">
                                            <AvatarImage
                                                src={avatarSource}
                                                alt={user.name}
                                            />
                                            <AvatarFallback className="bg-[#0a0a0a] text-4xl text-orange-500">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 rounded-full bg-black/0 transition group-hover:bg-black/20" />
                                        <div className="absolute inset-x-0 bottom-3 flex justify-center">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/75 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                                <Camera className="h-3.5 w-3.5 text-orange-500" />
                                                Изменить фото
                                            </span>
                                        </div>
                                    </button>
                                </DialogTrigger>

                            </div>

                            <DialogContent className="max-w-xl border border-white/10 bg-[#090909] p-0 text-white shadow-2xl">
                                <div className="flex flex-col gap-6 p-6 sm:p-7">
                                    <DialogHeader className="pr-10">
                                        <DialogTitle className="text-xl font-semibold text-white">
                                            Аватар профиля
                                        </DialogTitle>
                                        <DialogDescription className="text-sm text-zinc-400">
                                            Перетащите изображение в зону
                                            загрузки или выберите файл вручную.
                                            Поддерживаются JPG, PNG и WEBP до
                                            2 МБ.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form
                                        onSubmit={submitAvatar}
                                        className="flex flex-col gap-5"
                                    >
                                        <div className="flex flex-col items-center gap-4">
                                            <div
                                                role="button"
                                                tabIndex={processing ? -1 : 0}
                                                aria-label="Выбрать аватар"
                                                className={cn(
                                                    'flex w-full flex-col items-center rounded-[1.75rem] border border-dashed px-6 py-8 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909]',
                                                    isDraggingAvatar
                                                        ? 'border-orange-400 bg-orange-500/12'
                                                        : 'border-white/10 bg-white/[0.03] hover:border-orange-500/35 hover:bg-orange-500/8',
                                                    processing && 'cursor-wait opacity-80',
                                                )}
                                                onClick={openAvatarPicker}
                                                onKeyDown={handleAvatarDropzoneKeyDown}
                                                onDragEnter={(event) => {
                                                    if (processing) {
                                                        return;
                                                    }

                                                    event.preventDefault();
                                                    setIsDraggingAvatar(true);
                                                }}
                                                onDragOver={(event) => {
                                                    if (processing) {
                                                        return;
                                                    }

                                                    event.preventDefault();
                                                    setIsDraggingAvatar(true);
                                                }}
                                                onDragLeave={(event) => {
                                                    event.preventDefault();
                                                    setIsDraggingAvatar(false);
                                                }}
                                                onDrop={handleAvatarDrop}
                                            >
                                                <Avatar className="h-36 w-36 rounded-full border-4 border-white/10 bg-[#0a0a0a] shadow-2xl sm:h-44 sm:w-44">
                                                    <AvatarImage
                                                        src={avatarPreviewUrl ?? avatarSource}
                                                        alt={user.name}
                                                    />
                                                    <AvatarFallback className="bg-[#0a0a0a] text-5xl text-orange-500">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <p className="mt-5 text-lg font-semibold text-white">
                                                    Перетащите фото сюда
                                                </p>
                                                <p className="mt-2 max-w-xs text-sm text-zinc-500">
                                                    Или выберите один файл для
                                                    нового аватара.
                                                </p>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                                    disabled={processing}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openAvatarPicker();
                                                    }}
                                                >
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Выбрать файл
                                                </Button>
                                            </div>

                                            <input
                                                ref={fileInputRef}
                                                id="avatar"
                                                name="avatar"
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={handleAvatarSelection}
                                                className="hidden"
                                            />

                                            <div className="space-y-1 text-center">
                                                <p className="text-sm font-medium text-zinc-200">
                                                    {data.avatar
                                                        ? data.avatar.name
                                                        : 'Текущий аватар'}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    Изображение обновится сразу
                                                    после сохранения.
                                                </p>
                                            </div>
                                        </div>

                                        <InputError
                                            message={errors.avatar}
                                            className="text-center"
                                        />

                                        {progress && (
                                            <p className="text-center text-sm text-orange-400">
                                                Загрузка: {progress.percentage}%
                                            </p>
                                        )}

                                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                                onClick={openAvatarPicker}
                                            >
                                                Выбрать файл
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    !data.avatar || processing
                                                }
                                                className="bg-orange-500 text-white hover:bg-orange-600"
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <Upload />
                                                )}
                                                Сохранить аватар
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="mb-8">
                        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
                            {user.name}
                        </h1>
                        <p className="mt-1 mb-4 flex items-center gap-1.5 text-sm font-medium text-orange-500">
                            <Camera className="h-4 w-4" />
                            Партнер PechatPRO
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-zinc-400">
                            <div className="flex items-center gap-1.5">
                                <Phone className="h-4 w-4 text-zinc-500" />
                                <span>{user.phone}</span>
                            </div>
                            {user.city_name && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-zinc-500" />
                                    <span>{user.city_name}</span>
                                </div>
                            )}
                            {user.instagram_url && (
                                <div className="flex items-center gap-1.5">
                                    <Link2 className="h-4 w-4 text-zinc-500" />
                                    <a
                                        href={user.instagram_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="transition-colors hover:text-white"
                                    >
                                        Instagram
                                    </a>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-zinc-500" />
                                <span>В системе с 2026 г.</span>
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {status}
                        </div>
                    )}

                    <div className="mb-10 flex gap-6 overflow-x-auto border-y border-white/5 py-5 sm:gap-10">
                        <div className="group flex cursor-default flex-col">
                            <span className="text-2xl font-bold text-white transition-colors group-hover:text-orange-500">
                                {stats.totalOrders}
                            </span>
                            <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                                Всего проектов
                            </span>
                        </div>
                        <div className="group flex cursor-default flex-col">
                            <span className="text-2xl font-bold text-white transition-colors group-hover:text-orange-500">
                                {stats.activeOrders}
                            </span>
                            <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                                В работе
                            </span>
                        </div>
                        <div className="group flex cursor-default flex-col">
                            <span className="text-2xl font-bold text-white transition-colors group-hover:text-orange-500">
                                {stats.completed}
                            </span>
                            <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                                Готовых тиражей
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Dialog
                            open={isProfileDialogOpen}
                            onOpenChange={handleProfileDialogChange}
                        >
                            <Card className="flex flex-col justify-between border-white/5 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
                                <div>
                                    <h3 className="mb-2 text-lg font-semibold text-white">
                                        Личные данные
                                    </h3>
                                    <p className="mb-6 text-sm text-zinc-400">
                                        Имя, телефон, город и Instagram для связи с
                                        менеджером и клиентом.
                                    </p>
                                </div>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-fit border-white/10 bg-transparent text-white hover:bg-white/5"
                                    >
                                        Редактировать данные
                                    </Button>
                                </DialogTrigger>
                            </Card>

                            <DialogContent className="border border-white/10 bg-[#090909] text-white shadow-2xl sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-semibold text-white">
                                        Редактировать профиль
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Обновите личные данные, которые видны в
                                        вашем профиле.
                                    </DialogDescription>
                                </DialogHeader>

                                <form
                                    className="space-y-4"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        informationForm.put(updateProfileInformation.url(), {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setIsProfileDialogOpen(false);
                                            },
                                        });
                                    }}
                                >
                                    <div className="grid gap-2">
                                        <Label htmlFor="profile_city" className="text-zinc-300">
                                            Город
                                        </Label>
                                        <select
                                            id="profile_city"
                                            value={informationForm.data.city_id}
                                            onChange={(event) =>
                                                informationForm.setData('city_id', event.target.value)
                                            }
                                            className="h-10 rounded-4xl border border-white/10 bg-zinc-950/50 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                        >
                                            <option value="">Выберите город</option>
                                            {cities.map((city) => (
                                                <option key={city.id} value={city.id}>
                                                    {city.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={informationForm.errors.city_id} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="profile_name" className="text-zinc-300">
                                            Имя и фамилия
                                        </Label>
                                        <div className="relative">
                                            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                            <Input
                                                id="profile_name"
                                                value={informationForm.data.name}
                                                onChange={(event) =>
                                                    informationForm.setData('name', event.target.value)
                                                }
                                                className="border-white/10 bg-zinc-950/50 pl-10 text-white"
                                            />
                                        </div>
                                        <InputError message={informationForm.errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="profile_phone" className="text-zinc-300">
                                            Номер телефона
                                        </Label>
                                        <PhoneInput
                                            id="profile_phone"
                                            value={informationForm.data.phone}
                                            onAccept={(value) =>
                                                informationForm.setData('phone', String(value))
                                            }
                                            placeholder="+7 701 123 45 67"
                                            className="border-white/10 bg-zinc-950/50 text-white"
                                        />
                                        <InputError message={informationForm.errors.phone} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="profile_instagram" className="text-zinc-300">
                                            Instagram
                                        </Label>
                                        <div className="relative">
                                            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                            <Input
                                                id="profile_instagram"
                                                type="url"
                                                value={informationForm.data.instagram_url}
                                                onChange={(event) =>
                                                    informationForm.setData('instagram_url', event.target.value)
                                                }
                                                placeholder="https://instagram.com/vash_profil"
                                                className="border-white/10 bg-zinc-950/50 pl-10 text-white"
                                            />
                                        </div>
                                        <InputError message={informationForm.errors.instagram_url} />
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                            onClick={() => handleProfileDialogChange(false)}
                                        >
                                            Отмена
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={informationForm.processing}
                                            className="bg-orange-500 text-white hover:bg-orange-600"
                                        >
                                            {informationForm.processing && <Spinner />}
                                            Сохранить
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog
                            open={isPasswordDialogOpen}
                            onOpenChange={handlePasswordDialogChange}
                        >
                            <Card className="flex flex-col justify-between border-white/5 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
                                <div>
                                    <h3 className="mb-2 text-lg font-semibold text-white">
                                        Безопасность
                                    </h3>
                                    <p className="mb-6 text-sm text-zinc-400">
                                        Смена пароля для входа в ваш аккаунт
                                        PechatPRO.
                                    </p>
                                </div>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-fit border-white/10 bg-transparent text-white hover:bg-white/5"
                                    >
                                        Настройки безопасности
                                    </Button>
                                </DialogTrigger>
                            </Card>

                            <DialogContent className="border border-white/10 bg-[#090909] text-white shadow-2xl sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-semibold text-white">
                                        Обновить пароль
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Укажите текущий пароль и задайте новый.
                                    </DialogDescription>
                                </DialogHeader>

                                <form
                                    className="space-y-4"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        passwordForm.put(updateProfilePassword.url(), {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                passwordForm.reset();
                                                setIsPasswordDialogOpen(false);
                                            },
                                        });
                                    }}
                                >
                                    <div className="grid gap-2">
                                        <Label htmlFor="current_password" className="text-zinc-300">
                                            Текущий пароль
                                        </Label>
                                        <PasswordInput
                                            id="current_password"
                                            value={passwordForm.data.current_password}
                                            onChange={(event) =>
                                                passwordForm.setData('current_password', event.target.value)
                                            }
                                            className="border-white/10 bg-zinc-950/50 text-white"
                                        />
                                        <InputError message={passwordForm.errors.current_password} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="new_password" className="text-zinc-300">
                                            Новый пароль
                                        </Label>
                                        <PasswordInput
                                            id="new_password"
                                            value={passwordForm.data.password}
                                            onChange={(event) =>
                                                passwordForm.setData('password', event.target.value)
                                            }
                                            className="border-white/10 bg-zinc-950/50 text-white"
                                        />
                                        <InputError message={passwordForm.errors.password} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation" className="text-zinc-300">
                                            Подтверждение пароля
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            value={passwordForm.data.password_confirmation}
                                            onChange={(event) =>
                                                passwordForm.setData('password_confirmation', event.target.value)
                                            }
                                            className="border-white/10 bg-zinc-950/50 text-white"
                                        />
                                        <InputError message={passwordForm.errors.password_confirmation} />
                                    </div>

                                    <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3 text-xs text-zinc-500">
                                        <div className="inline-flex items-center gap-2">
                                            <Lock className="h-4 w-4 text-orange-400" />
                                            После смены пароля используйте новый пароль при следующем входе.
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                            onClick={() => handlePasswordDialogChange(false)}
                                        >
                                            Отмена
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={passwordForm.processing}
                                            className="bg-orange-500 text-white hover:bg-orange-600"
                                        >
                                            {passwordForm.processing && <Spinner />}
                                            Обновить пароль
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </>
    );
}

ProfileShow.layout = {
    breadcrumbs: [
        {
            title: 'Личный кабинет',
            href: profileShow(),
        },
    ],
};
