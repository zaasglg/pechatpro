import { Head, useForm } from '@inertiajs/react';
import { MapPinned, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroyCity,
    index as cityIndex,
    store as storeCity,
    update as updateCity,
} from '@/actions/App/Http/Controllers/Admin/CityController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CityItem = {
    id: number;
    name: string;
    usersCount: number;
};

type Props = {
    cities: CityItem[];
    error?: string | null;
    status?: string | null;
};

export default function CitiesIndex({ cities, error, status }: Props) {
    const [editingCityId, setEditingCityId] = useState<number | null>(null);

    const createForm = useForm({
        name: '',
    });

    const editForm = useForm({
        name: '',
    });

    const deleteForm = useForm({});

    const startEditing = (city: CityItem) => {
        setEditingCityId(city.id);
        editForm.setData('name', city.name);
        editForm.clearErrors();
    };

    const stopEditing = () => {
        setEditingCityId(null);
        editForm.reset();
        editForm.clearErrors();
    };

    return (
        <>
            <Head title="Города" />

            <div className="flex w-full flex-col gap-6 p-6 md:p-10">
                <div className="flex flex-col gap-2">
                    <h1 className="text-[28px] font-semibold tracking-tight text-white">
                        Города
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-[#A1A1AA]">
                        Управляйте списком городов, которые фотограф видит при регистрации и в профиле.
                    </p>
                </div>

                {status && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {status}
                    </div>
                )}

                {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <Card className="rounded-2xl border-white/5 bg-[#0f0f11] shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-medium text-white">
                            Добавить город
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="flex flex-col gap-4 md:flex-row md:items-end"
                            onSubmit={(event) => {
                                event.preventDefault();
                                createForm.post(storeCity.url(), {
                                    preserveScroll: true,
                                    onSuccess: () => createForm.reset(),
                                });
                            }}
                        >
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="city_name" className="text-zinc-300">
                                    Название города
                                </Label>
                                <Input
                                    id="city_name"
                                    value={createForm.data.name}
                                    onChange={(event) =>
                                        createForm.setData('name', event.target.value)
                                    }
                                    placeholder="Например, Алматы"
                                    className="border-white/10 bg-zinc-950/50 text-white"
                                />
                                <InputError message={createForm.errors.name} />
                            </div>

                            <Button
                                type="submit"
                                disabled={createForm.processing}
                                className="bg-orange-500 text-white hover:bg-orange-600"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Добавить
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-white/5 bg-[#0f0f11] shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-medium text-white">
                            Список городов
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {cities.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 px-6 py-14 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                    <MapPinned className="h-6 w-6 text-orange-400" />
                                </div>
                                <h2 className="text-lg font-medium text-white">
                                    Города еще не добавлены
                                </h2>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Добавьте хотя бы один город, чтобы фотограф мог выбрать его при регистрации.
                                </p>
                            </div>
                        ) : (
                            cities.map((city) => {
                                const isEditing = editingCityId === city.id;

                                return (
                                    <div
                                        key={city.id}
                                        className="rounded-2xl border border-white/5 bg-[#141417] p-5"
                                    >
                                        {isEditing ? (
                                            <form
                                                className="flex flex-col gap-4 md:flex-row md:items-end"
                                                onSubmit={(event) => {
                                                    event.preventDefault();
                                                    editForm.put(updateCity.url(city.id), {
                                                        preserveScroll: true,
                                                        onSuccess: () => stopEditing(),
                                                    });
                                                }}
                                            >
                                                <div className="flex-1 space-y-2">
                                                    <Label className="text-zinc-300">
                                                        Название города
                                                    </Label>
                                                    <Input
                                                        value={editForm.data.name}
                                                        onChange={(event) =>
                                                            editForm.setData('name', event.target.value)
                                                        }
                                                        className="border-white/10 bg-zinc-950/50 text-white"
                                                    />
                                                    <InputError message={editForm.errors.name} />
                                                </div>

                                                <div className="flex flex-col gap-3 sm:flex-row">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                                        onClick={stopEditing}
                                                    >
                                                        Отмена
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        disabled={editForm.processing}
                                                        className="bg-orange-500 text-white hover:bg-orange-600"
                                                    >
                                                        Сохранить
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-400">
                                                        <MapPinned className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-base font-medium text-white">
                                                            {city.name}
                                                        </h2>
                                                        <p className="mt-1 inline-flex items-center gap-2 text-sm text-[#A1A1AA]">
                                                            <Users className="h-4 w-4 text-orange-400" />
                                                            Пользователей: {city.usersCount}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-3 sm:flex-row">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="border-white/10 bg-transparent text-white hover:bg-white/5"
                                                        onClick={() => startEditing(city)}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Редактировать
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="border-red-500/20 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                                        disabled={deleteForm.processing}
                                                        onClick={() => {
                                                            if (!window.confirm(`Удалить город ${city.name}?`)) {
                                                                return;
                                                            }

                                                            deleteForm.delete(destroyCity.url(city.id), {
                                                                preserveScroll: true,
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Удалить
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CitiesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Города',
            href: cityIndex(),
        },
    ],
};
