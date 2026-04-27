export type TranslationTree = {
    [key: string]: string | TranslationTree;
};

export type LocaleOption = {
    code: string;
    label: string;
};

export type Localization = {
    currentLocale: string;
    availableLocales: LocaleOption[];
    translations: TranslationTree;
};
