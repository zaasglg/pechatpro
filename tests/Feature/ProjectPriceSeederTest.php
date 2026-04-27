<?php

use App\Support\ProjectPricingCalculator;

test('project pricing calculator exposes all configured album rules', function () {
    $calculator = app(ProjectPricingCalculator::class);
    $rules = $calculator->albumRules();

    expect($rules)->toHaveCount(16);
    expect($rules[0])->toMatchArray([
        'albumType' => 'Пластик',
        'albumSize' => '20x20',
        'coverType' => 'Мягкий',
        'coverPrice' => 700,
        'pagePrice' => 3500,
    ]);
    expect(collect($rules)->contains(fn (array $rule): bool => $rule === [
        'albumType' => 'Кожаный',
        'albumSize' => '30x30',
        'coverType' => 'Кожаный',
        'coverPrice' => 4000,
        'pagePrice' => 1000,
        'pageCountUnit' => 'разворотов',
    ]))->toBeTrue();
});

test('project pricing calculator applies portrait surcharges', function () {
    $calculator = app(ProjectPricingCalculator::class);

    expect($calculator->portraitRules())->toHaveCount(6);
    expect($calculator->resolvePortraitExtraPrice(0))->toBe(0);
    expect($calculator->resolvePortraitExtraPrice(1))->toBe(0);
    expect($calculator->resolvePortraitExtraPrice(2))->toBe(500);
    expect($calculator->resolvePortraitExtraPrice(7))->toBe(1000);
});
