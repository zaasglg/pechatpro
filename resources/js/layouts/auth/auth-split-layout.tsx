import { Link, usePage } from '@inertiajs/react';
import { Camera } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid min-h-screen flex-col items-center justify-center p-6 sm:p-0 lg:max-w-none lg:grid-cols-2 lg:px-0 bg-[#050505] text-white font-sans selection:bg-orange-500/30">
            {/* Background glowing effects for the whole page */}
            <div className="pointer-events-none absolute -top-40 left-1/4 w-full max-w-2xl -translate-x-1/2 aspect-square rounded-full bg-orange-600/10 blur-[120px] opacity-70" />
            <div className="pointer-events-none absolute top-1/3 right-0 w-96 aspect-square rounded-full bg-orange-500/10 blur-[100px] opacity-60" />

            {/* Left Side: Presentation */}
            <div className="relative hidden h-full flex-col p-10 text-white lg:flex justify-between border-r border-white/5 overflow-hidden bg-[#0a0a0a]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />
                
                <AppLogo />
                {/* <Link
                    href={home()}
                    className="relative z-20 flex items-center text-2xl font-bold tracking-tight text-white drop-shadow-md hover:opacity-90 transition-opacity w-fit"
                >
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
                        <Camera className="h-6 w-6 text-white" />
                    </div>
                    {name || 'PechatPRO'}
                </Link> */}

                <div className="relative z-20 mt-auto mb-8">
                    <blockquote className="space-y-5 text-zinc-300">
                        <p className="text-xl md:text-2xl font-medium text-white/90 leading-relaxed max-w-lg tracking-tight">
                            &ldquo;Мы берем на себя верстку и цветокоррекцию, чтобы вы могли снимать еще больше классов. Ваш личный продакшен полного цикла.&rdquo;
                        </p>
                        <footer className="text-sm font-medium text-orange-400/90 tracking-wide uppercase">
                            {name || 'PechatPRO'}: полный цикл производства
                        </footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:p-8 relative z-10 flex items-center justify-center">
                <div className="mx-auto flex w-full flex-col justify-center gap-8 sm:w-[400px] p-8 sm:p-10 rounded-3xl bg-white/[0.02] sm:bg-white/[0.02] border border-white/5 sm:border-white/5 backdrop-blur-xl sm:backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <Link
                        href={home()}
                        className="relative z-20 flex items-center justify-center lg:hidden mb-2"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl shadow-orange-500/20">
                            <Camera className="h-7 w-7 text-white" />
                        </div>
                    </Link>
                    <div className="flex flex-col items-center gap-3 text-center mb-2 z-20">
                        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
                        <p className="text-base text-balance text-zinc-400">
                            {description}
                        </p>
                    </div>
                    
                    {/* The framework's form usually renders children with regular input styles. Let's make sure the inputs look good by applying some custom global classes or adjusting the inputs in the login/register specifically if needed. The shadcn inputs will adapt to standard dark mode if `dark` class is present on root. */}
                    <div className="dark z-20 relative w-full">
                        {children}
                    </div>

                    {/* Subtle inner glow for form card */}
                    <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-orange-500/10 to-transparent opacity-50" />
                </div>
            </div>
        </div>
    );
}
