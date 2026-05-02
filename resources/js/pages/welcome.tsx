import { Head, Link, usePage } from '@inertiajs/react';
import {
    Printer,
    Image as ImageIcon,
    Clock,
    ArrowRight,
    UploadCloud,
    LayoutDashboard,
    Truck,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/hooks/use-translations';
import { dashboard, login, register } from '@/routes';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;
    const { t } = useTranslations();

    const features = [
        {
            key: 'upload',
            icon: <UploadCloud className="h-8 w-8 text-emerald-400" />,
            title: t('welcome.features.upload.title'),
            description: t('welcome.features.upload.description'),
        },
        {
            key: 'design',
            icon: <ImageIcon className="h-8 w-8 text-emerald-400" />,
            title: t('welcome.features.design.title'),
            description: t('welcome.features.design.description'),
        },
        {
            key: 'print',
            icon: <Printer className="h-8 w-8 text-emerald-400" />,
            title: t('welcome.features.print.title'),
            description: t('welcome.features.print.description'),
        },
        {
            key: 'time',
            icon: <Clock className="h-8 w-8 text-emerald-400" />,
            title: t('welcome.features.time.title'),
            description: t('welcome.features.time.description'),
        },
    ];

    const stats = [
        { key: 'runs', value: '500 000+', label: t('welcome.stats.runs') },
        {
            key: 'photographers',
            value: '200+',
            label: t('welcome.stats.photographers'),
        },
        { key: 'evening', value: '110%', label: t('welcome.stats.evening') },
    ];

    const steps = [
        {
            key: 'upload',
            title: t('welcome.steps.upload.title'),
            desc: t('welcome.steps.upload.description'),
            icon: <UploadCloud className="h-6 w-6 text-emerald-400" />,
        },
        {
            key: 'template',
            title: t('welcome.steps.template.title'),
            desc: t('welcome.steps.template.description'),
            icon: <LayoutDashboard className="h-6 w-6 text-emerald-400" />,
        },
        {
            key: 'layout',
            title: t('welcome.steps.layout.title'),
            desc: t('welcome.steps.layout.description'),
            icon: <ImageIcon className="h-6 w-6 text-emerald-400" />,
        },
        {
            key: 'delivery',
            title: t('welcome.steps.delivery.title'),
            desc: t('welcome.steps.delivery.description'),
            icon: <Truck className="h-6 w-6 text-emerald-400" />,
        },
    ];

    return (
        <>
            <Head title={t('welcome.meta_title')}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
            </Head>

            <div className="dark relative min-h-screen overflow-hidden bg-[#111827] font-sans text-white selection:bg-emerald-500/25">
                {/* Фоновые градиенты */}
                <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[70rem] w-[70rem] rounded-full bg-emerald-500/6 blur-[150px]" />
                <div className="pointer-events-none absolute right-[10%] -bottom-[10%] h-[60rem] w-[60rem] rounded-full bg-emerald-400/6 blur-[150px]" />

                {/* Навигация */}
                <header className="absolute inset-x-0 top-0 z-50">
                    <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
                        <div className="flex flex-1">
                            <AppLogo />
                        </div>
                        <div className="flex flex-1 justify-end gap-3">
                            <LanguageSwitcher className="hidden md:inline-flex" />
                            {auth.user ? (
                                <Link href={dashboard()}>
                                    <Button
                                        variant="outline"
                                        className="border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10"
                                    >
                                        {t('welcome.nav.dashboard')}
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href={login()}>
                                        <Button
                                            variant="ghost"
                                            className="text-muted-foreground hover:text-emerald-50"
                                        >
                                            {t('welcome.nav.login')}
                                        </Button>
                                    </Link>
                                    {canRegister && (
                                        <Link href={register()}>
                                            <Button className="bg-emerald-500 text-white hover:bg-emerald-600">
                                                {t('welcome.nav.start')}
                                            </Button>
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main className="relative isolate pt-24 pb-16 sm:pt-32">
                    {/* Hero Section */}
                    <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-24 text-center sm:pb-14 lg:grid-cols-2 lg:px-8">
                        <div className="text-left">
                            <div className="mb-6 md:hidden">
                                <LanguageSwitcher />
                            </div>
                            <h1 className="mb-8 text-5xl font-semibold sm:text-7xl">
                                {t('welcome.hero.title_prefix')}{' '}
                                <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                                    {t('welcome.hero.title_highlight')}
                                </span>
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg font-medium text-muted-foreground sm:text-xl/8">
                                {t('welcome.hero.description')}
                            </p>
                            <div className="mt-10 flex flex-col items-start justify-start gap-4 sm:flex-row sm:gap-6">
                                {auth.user ? (
                                    <Link href={dashboard()}>
                                        <Button
                                            size="lg"
                                            className="w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600 sm:w-auto"
                                        >
                                            {t('welcome.hero.dashboard_button')}
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <>
                                        <Link href={register()}>
                                            <Button
                                                size="lg"
                                                className="w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600 sm:w-auto"
                                            >
                                                {t(
                                                    'welcome.hero.primary_button',
                                                )}
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 sm:w-auto"
                                            onClick={() =>
                                                document
                                                    .getElementById('learn-more')
                                                    ?.scrollIntoView({ behavior: 'smooth' })
                                            }
                                        >
                                            {t(
                                                'welcome.hero.secondary_button',
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="hidden justify-center lg:flex 2xl:justify-end">
                            <img
                                src="./assets/illustration.svg"
                                alt={t('welcome.hero.illustration_alt')}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Learn More / Promo Section */}
                    <div
                        id="learn-more"
                        className="mx-auto mt-8 mb-0 max-w-7xl px-6 lg:px-8"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900/60 px-8 py-16 backdrop-blur-md sm:px-16 sm:py-20">
                            {/* Animated glow blobs */}
                            <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 animate-pulse rounded-full bg-emerald-500/10 blur-3xl" />
                            <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 animate-pulse rounded-full bg-emerald-400/10 blur-3xl [animation-delay:1.5s]" />

                            {/* Badge */}
                            <div className="absolute top-6 right-6 z-10 rotate-6">
                                <div className="flex animate-bounce flex-col items-center justify-center rounded-full bg-emerald-500 px-4 py-3 text-center shadow-lg shadow-emerald-500/40 [animation-duration:2s]">
                                    <span className="text-xs font-black uppercase leading-tight tracking-wider text-white">СУПЕР</span>
                                    <span className="text-xs font-black uppercase leading-tight tracking-wider text-white">СКИДКА! 🎉</span>
                                </div>
                            </div>

                            <div className="mx-auto max-w-3xl text-center">
                                {/* Main headline */}
                                <p className="text-5xl font-black uppercase leading-tight text-emerald-400 sm:text-6xl lg:text-7xl">
                                    Печать 1 разворота
                                </p>
                                <p className="mt-2 text-5xl font-black uppercase leading-tight text-white sm:text-6xl lg:text-7xl">
                                    всего{' '}
                                    <span className="relative inline-block">
                                        <span className="relative z-10 text-emerald-400">500 ТГ!</span>
                                        <span className="absolute inset-x-0 bottom-1 h-3 -skew-x-3 bg-emerald-500/20" />
                                    </span>
                                </p>

                                {/* Divider */}
                                <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

                                {/* Description */}
                                <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
                                    Студия PechatPRO берёт на себя всю рутину монтажа и верстки
                                    школьных виньеток. Просто сделайте классные кадры, а дизайн
                                    и первоклассную печать оставьте профессионалам.
                                </p>

                                {/* Key points */}
                                <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm font-medium">
                                    {['Монтаж включён', 'Быстрая печать', 'Доставка по РК'].map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-emerald-300"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>

                                {/* CTA */}
                                <div className="mt-10">
                                    {auth.user ? (
                                        <Link href={dashboard()}>
                                            <Button size="lg" className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
                                                {t('welcome.nav.dashboard')}
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link href={register()}>
                                            <Button size="lg" className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
                                                {t('welcome.hero.primary_button')}
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="mx-auto my-16 max-w-7xl px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {features.map((feature) => (
                                <Card
                                    key={feature.key}
                                    className="border-slate-400/10 bg-slate-900/30 shadow-xl backdrop-blur-md transition-colors duration-300 hover:border-emerald-500/35"
                                >
                                    <CardHeader className="gap-2 pb-3">
                                        {feature.icon}
                                        <CardTitle className="text-xl text-white">
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
                    <div className="mx-auto mt-32 mb-16 max-w-7xl px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-y-12 divide-white/10 text-center sm:grid-cols-3 sm:divide-x">
                            {stats.map((stat) => (
                                <div
                                    key={stat.key}
                                    className="flex flex-col gap-y-3 px-8"
                                >
                                    <dt className="text-base text-muted-foreground">
                                        {stat.label}
                                    </dt>
                                    <dd className="order-first text-5xl font-semibold text-white">
                                        {stat.value}
                                    </dd>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How it works Section */}
                    <div className="mx-auto mt-32 max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold text-white sm:text-4xl">
                                {t('welcome.steps.heading')}
                            </h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                {t('welcome.steps.description')}
                            </p>
                        </div>
                        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {steps.map((step) => (
                                <div
                                    key={step.key}
                                    className="relative flex flex-col gap-4 rounded-2xl border border-slate-400/10 bg-slate-900/30 p-8 backdrop-blur transition hover:border-emerald-500/35"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15">
                                        {step.icon}
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {step.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="mx-auto mt-32 mb-16 max-w-7xl px-6 lg:px-8">
                        <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-24 text-center shadow-2xl shadow-black/20 backdrop-blur-md sm:px-16">
                            <h2 className="mx-auto max-w-2xl text-3xl font-bold text-white sm:text-4xl">
                                {t('welcome.cta.title')}
                            </h2>
                            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-emerald-50/90">
                                {t('welcome.cta.description')}
                            </p>
                            <div className="mt-10 flex items-center justify-center gap-x-6">
                                {auth.user ? (
                                    <Link href={dashboard()}>
                                        <Button
                                            size="lg"
                                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                                        >
                                            {t('welcome.cta.dashboard_button')}{' '}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link href={register()}>
                                        <Button
                                            size="lg"
                                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                                        >
                                            {t('welcome.cta.primary_button')}{' '}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative mt-auto border-t border-white/10 bg-white/5 backdrop-blur">
                    <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-8 lg:px-8">
                        <p className="text-center text-sm text-muted-foreground">
                            {t('welcome.footer')}
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
