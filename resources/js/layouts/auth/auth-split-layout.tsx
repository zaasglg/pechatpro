import { Link, usePage } from '@inertiajs/react';
import { Camera } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslations } from '@/hooks/use-translations';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;
    const { t } = useTranslations();

    return (
        <div className="relative grid min-h-screen flex-col items-center justify-center bg-[#111827] p-6 font-sans text-white selection:bg-emerald-500/25 sm:p-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Background glowing effects for the whole page */}
            <div className="pointer-events-none absolute -top-40 left-1/4 aspect-square w-full max-w-2xl -translate-x-1/2 rounded-full bg-emerald-500/10 opacity-70 blur-[120px]" />
            <div className="pointer-events-none absolute top-1/3 right-0 aspect-square w-96 rounded-full bg-emerald-400/10 opacity-60 blur-[100px]" />
            <div className="absolute top-6 right-6 z-30">
                <LanguageSwitcher />
            </div>

            {/* Left Side: Presentation */}
            <div className="relative hidden h-full flex-col justify-between overflow-hidden border-r border-white/5 bg-[#0f172a] p-10 text-white lg:flex">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] bg-[size:24px_24px]" />

                <AppLogo />

                <div className="relative z-20 mt-auto mb-10 max-w-md pr-12 xl:max-w-lg xl:pr-20">
                    <blockquote className="space-y-5 text-zinc-300">
                        <p className="text-xl leading-relaxed font-medium text-white/90 md:text-2xl">
                            &ldquo;{t('auth.layout.quote')}&rdquo;
                        </p>
                        <footer className="text-sm font-medium text-emerald-400/90 uppercase">
                            {name || 'PechatPRO'}: {t('auth.layout.footer')}
                        </footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="relative z-10 flex w-full items-center justify-center py-6 lg:absolute lg:inset-0 lg:p-8">
                <div className="relative mx-auto flex w-full flex-col justify-center gap-6 overflow-hidden rounded-3xl border border-slate-400/10 bg-[#1f2937]/90 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:w-[440px] sm:border-slate-400/10 sm:bg-[#1f2937]/90 sm:p-8 lg:max-h-[calc(100vh-3rem)] lg:w-[460px] lg:overflow-y-auto">
                    <Link
                        href={home()}
                        className="relative z-20 mb-2 flex items-center justify-center lg:hidden"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/20">
                            <Camera className="h-7 w-7 text-white" />
                        </div>
                    </Link>
                    <div className="z-20 mb-1 flex flex-col items-center gap-2 text-center">
                        <h1 className="text-3xl font-semibold text-white">
                            {title}
                        </h1>
                        <p className="max-w-sm text-sm leading-7 text-balance text-zinc-400">
                            {description}
                        </p>
                    </div>

                    {/* The framework's form usually renders children with regular input styles. Let's make sure the inputs look good by applying some custom global classes or adjusting the inputs in the login/register specifically if needed. The shadcn inputs will adapt to standard dark mode if `dark` class is present on root. */}
                    <div className="dark relative z-20 w-full">{children}</div>

                    {/* Subtle inner glow for form card */}
                    <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-emerald-500/12 to-transparent opacity-50" />
                </div>
            </div>
        </div>
    );
}
