import { usePage } from '@inertiajs/react';
import type { LocaleOption, Localization, TranslationTree } from '@/types';

const resolveTranslation = (
    translations: TranslationTree,
    key: string,
): string | undefined => {
    return key.split('.').reduce<string | TranslationTree | undefined>(
        (value, segment) => {
            if (typeof value !== 'object' || value === null) {
                return undefined;
            }

            return value[segment];
        },
        translations,
    ) as string | undefined;
};

type UseTranslationsResult = {
    currentLocale: Localization['currentLocale'];
    availableLocales: LocaleOption[];
    t: (key: string, fallback?: string) => string;
};

export function useTranslations(): UseTranslationsResult {
    const { localization } = usePage().props;

    return {
        currentLocale: localization.currentLocale,
        availableLocales: localization.availableLocales,
        t: (key: string, fallback?: string) =>
            resolveTranslation(localization.translations, key) ?? fallback ?? key,
    };
}
