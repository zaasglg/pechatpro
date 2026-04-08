import { Head, Link, usePage } from '@inertiajs/react';
import { Camera, Printer, Image as ImageIcon, Clock, ArrowRight, UploadCloud } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard, login, register } from '@/routes';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;

    const features = [
        {
            icon: <UploadCloud className="h-8 w-8 text-orange-500" />,
            title: 'Просто отправьте фото',
            description: 'Вы проводите съемку фото или видео, а мы берем на себя всю рутину загрузки и верстки.',
        },
        {
            icon: <ImageIcon className="h-8 w-8 text-orange-500" />,
            title: 'Профессиональный монтаж',
            description: 'Наши дизайнеры сами собирают макеты для школьных фотокниг и классных виньеток.',
        },
        {
            icon: <Printer className="h-8 w-8 text-orange-500" />,
            title: 'Качественная печать',
            description: 'Быстрая и безупречная печать готовых проектов на надежном оборудовании.',
        },
        {
            icon: <Clock className="h-8 w-8 text-orange-500" />,
            title: 'Экономия вашего времени',
            description: 'Вы забудете о ночных посиделках за обработкой и увеличите объемы съемок.',
        },
    ];

    const stats = [
        { value: '500+', label: 'напечатанных тиражей' },
        { value: '50+', label: 'фотографов с нами' },
        { value: '100%', label: 'свободного вечера' },
    ];

    return (
        <>
            <Head title="PechatPRO | Мы монтируем и печатаем">
                <link rel="preconnect" href="https://fonts.bunny.net" />
            </Head>

            <div className="relative min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30 overflow-hidden dark">
                {/* Фоновый блюр (светящееся пятно) */}
                <div className="pointer-events-none absolute -top-1/2 left-1/2 w-full max-w-3xl -translate-x-1/2 aspect-square rounded-full bg-orange-500/15 blur-[120px]" />

                {/* Навигация */}
                <header className="absolute inset-x-0 top-0 z-50">
                    <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
                        <div className="flex flex-1">
                           <AppLogo />
                        </div>
                        <div className="flex flex-1 justify-end gap-4">
                            {auth.user ? (
                                <Link href={dashboard()}>
                                    <Button
                                        variant="outline"
                                        className="border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10"
                                    >
                                        В панель
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href={login()}>
                                        <Button
                                            variant="ghost"
                                            className="text-muted-foreground hover:text-white"
                                        >
                                            Войти
                                        </Button>
                                    </Link>
                                    {canRegister && (
                                        <Link href={register()}>
                                            <Button className="bg-orange-500 text-white hover:bg-orange-600">
                                                Начать
                                            </Button>
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main className="relative isolate pt-24 sm:pt-32 pb-16">
                    {/* Hero Section */}
                    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32 text-center">
                        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl mb-8">
                            Вы фотографируете —{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                                остальное делаем мы
                            </span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-muted-foreground sm:text-xl/8">
                            Студия PechatPRO берет на себя всю рутину монтажа и верстки школьных виньеток. 
                            Просто сделайте классные кадры, а дизайн и первоклассную печать оставьте профессионалам.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                            {auth.user ? (
                                <Link href={dashboard()}>
                                    <Button size="lg" className="w-full sm:w-auto bg-orange-500 text-white hover:bg-orange-600 gap-2">
                                        Перейти в панель
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href={register()}>
                                        <Button size="lg" className="w-full sm:w-auto bg-orange-500 text-white hover:bg-orange-600 gap-2">
                                            Начать работу
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Link href={login()}>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full sm:w-auto border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10"
                                        >
                                            Узнать больше
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="mx-auto max-w-7xl px-6 lg:px-8 my-16">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {features.map((feature, index) => (
                                <Card
                                    key={index}
                                    className="border-white/10 bg-white/5 shadow-xl backdrop-blur-md transition-colors duration-300 hover:border-orange-500/50"
                                >
                                    <CardHeader className="pb-3 gap-2">
                                        {feature.icon}
                                        <CardTitle className="text-xl tracking-tight text-white">
                                            {feature.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-32 mb-16">
                        <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-3 text-center sm:divide-x divide-white/10">
                            {stats.map((stat, index) => (
                                <div key={index} className="flex flex-col gap-y-3 px-8">
                                    <dt className="text-base text-muted-foreground">{stat.label}</dt>
                                    <dd className="order-first text-5xl font-semibold tracking-tight text-white">
                                        {stat.value}
                                    </dd>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative border-t border-white/10 bg-white/5 backdrop-blur mt-auto">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground text-center">
                            &copy; 2026 PechatPRO. Все права защищены.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
