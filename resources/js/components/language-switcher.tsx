import { Link } from '@inertiajs/react';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { update } from '@/routes/locale';

export function LanguageSwitcher({ className }: { className?: string }) {
    const { currentLocale, availableLocales, t } = useTranslations();

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md',
                className,
            )}
            aria-label={t('common.language')}
        >
            {availableLocales.map((locale) => {
                const isCurrent = locale.code === currentLocale;

                return (
                    <Link
                        key={locale.code}
                        href={update()}
                        method="post"
                        data={{ locale: locale.code }}
                        preserveScroll
                        as="button"
                        className={cn(
                            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                            isCurrent
                                ? 'bg-emerald-500 text-emerald-50'
                                : 'text-zinc-300 hover:bg-white/10 hover:text-white',
                        )}
                        aria-current={isCurrent ? 'true' : undefined}
                    >
                        {locale.label}
                    </Link>
                );
            })}
        </div>
    );
}
