import { Head, useForm } from '@inertiajs/react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
    destroy as destroyCity,
    index as cityIndex,
    store as storeCity,
    update as updateCity,
} from '@/actions/App/Http/Controllers/Admin/CityController';
import InputError from '@/components/input-error';

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
    const addInputRef = useRef<HTMLInputElement>(null);

    const createForm = useForm({ name: '' });
    const editForm = useForm({ name: '' });
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

            <div className="mx-auto w-full max-w-7xl p-6">
                <h1 className="text-xl font-medium text-white">Города</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Список городов для регистрации и профиля фотографа.
                </p>

                {status && (
                    <p className="mt-4 text-sm text-emerald-400">{status}</p>
                )}
                {error && (
                    <p className="mt-4 text-sm text-red-400">{error}</p>
                )}

                {/* Add form */}
                <form
                    className="mt-6 flex items-center gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        createForm.post(storeCity.url(), {
                            preserveScroll: true,
                            onSuccess: () => {
                                createForm.reset();
                                addInputRef.current?.focus();
                            },
                        });
                    }}
                >
                    <input
                        ref={addInputRef}
                        value={createForm.data.name}
                        onChange={(e) =>
                            createForm.setData('name', e.target.value)
                        }
                        placeholder="Название города"
                        className="flex-1 border-b border-white/10 bg-transparent py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/30"
                    />
                    <button
                        type="submit"
                        disabled={createForm.processing}
                        className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Добавить
                    </button>
                </form>
                {createForm.errors.name && (
                    <InputError
                        message={createForm.errors.name}
                        className="mt-1"
                    />
                )}

                {/* City list */}
                <div className="mt-6">
                    {cities.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-600">
                            Городов пока нет
                        </p>
                    ) : (
                        <ul className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
                            {cities.map((city) => {
                                const isEditing = editingCityId === city.id;

                                return (
                                    <li
                                        key={city.id}
                                        className="border-t border-white/5"
                                    >
                                        {isEditing ? (
                                            <form
                                                className="flex items-center gap-3 py-3"
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    editForm.put(
                                                        updateCity.url(city.id),
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: stopEditing,
                                                        },
                                                    );
                                                }}
                                            >
                                                <input
                                                    autoFocus
                                                    value={editForm.data.name}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'name',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="flex-1 border-b border-white/20 bg-transparent py-1 text-sm text-white outline-none focus:border-white/40"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <IconButton
                                                        type="submit"
                                                        disabled={
                                                            editForm.processing
                                                        }
                                                        title="Сохранить"
                                                        className="text-emerald-400 hover:text-emerald-300"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </IconButton>
                                                    <IconButton
                                                        type="button"
                                                        onClick={stopEditing}
                                                        title="Отмена"
                                                        className="text-zinc-500 hover:text-zinc-300"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </IconButton>
                                                </div>
                                                {editForm.errors.name && (
                                                    <InputError
                                                        message={
                                                            editForm.errors.name
                                                        }
                                                    />
                                                )}
                                            </form>
                                        ) : (
                                            <div className="group flex items-center gap-4 py-3">
                                                <span className="flex-1 text-sm text-white">
                                                    {city.name}
                                                </span>
                                                <span className="text-xs text-zinc-600">
                                                    {city.usersCount}{' '}
                                                    {plural(
                                                        city.usersCount,
                                                        'пользователь',
                                                        'пользователя',
                                                        'пользователей',
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                                    <IconButton
                                                        type="button"
                                                        onClick={() =>
                                                            startEditing(city)
                                                        }
                                                        title="Редактировать"
                                                        className="text-zinc-500 hover:text-zinc-200"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </IconButton>
                                                    <IconButton
                                                        type="button"
                                                        disabled={
                                                            deleteForm.processing
                                                        }
                                                        onClick={() => {
                                                            if (
                                                                !window.confirm(
                                                                    `Удалить город «${city.name}»?`,
                                                                )
                                                            )
                                                                return;
                                                            deleteForm.delete(
                                                                destroyCity.url(
                                                                    city.id,
                                                                ),
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                        }}
                                                        title="Удалить"
                                                        className="text-zinc-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}

function IconButton({
    children,
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
    return (
        <button
            {...props}
            className={`rounded p-1 transition disabled:opacity-40 ${className}`}
        >
            {children}
        </button>
    );
}

function plural(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

CitiesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Города',
            href: cityIndex(),
        },
    ],
};
