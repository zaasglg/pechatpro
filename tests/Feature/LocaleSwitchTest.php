<?php

use Inertia\Testing\AssertableInertia as Assert;

it('defaults frontend locale to russian for guest pages', function () {
    config()->set('app.locale', 'en');
    config()->set('app.frontend_locale', 'ru');

    $this->get('/')
        ->assertOk()
        ->assertSee('lang="ru"', false)
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->where('localization.currentLocale', 'ru')
            ->where('localization.availableLocales', [
                ['code' => 'ru', 'label' => 'Русский'],
                ['code' => 'kk', 'label' => 'Қазақша'],
            ])
            ->where('localization.translations.common.language', 'Язык')
            ->where('localization.translations.welcome.nav.login', 'Войти'));
});

it('stores the selected locale in session and shares kazakh translations', function () {
    $this->from('/')
        ->post(route('locale.update'), ['locale' => 'kk'])
        ->assertRedirect('/')
        ->assertSessionHas('locale', 'kk');

    $this->get('/')
        ->assertOk()
        ->assertSee('lang="kk"', false)
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->where('localization.currentLocale', 'kk')
            ->where('localization.translations.common.language', 'Тіл')
            ->where('localization.translations.welcome.nav.login', 'Кіру'));
});

it('rejects unsupported locales', function () {
    $this->from('/')
        ->post(route('locale.update'), ['locale' => 'en'])
        ->assertRedirect('/')
        ->assertSessionHasErrors(['locale']);
});
