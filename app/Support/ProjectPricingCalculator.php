<?php

namespace App\Support;

use App\Models\Project;

class ProjectPricingCalculator
{
    /**
     * @var array<string, array<string, array<string, array{coverPrice: int, pagePrice: int}>>>
     */
    private const ALBUM_RULES = [
        'Пластик' => [
            '20x30' => [
                'Твердый' => ['coverPrice' => 1500, 'pagePrice' => 500],
                'Мягкий' => ['coverPrice' => 700, 'pagePrice' => 500],
            ],
            '20x20' => [
                'Твердый' => ['coverPrice' => 1500, 'pagePrice' => 500],
                'Мягкий' => ['coverPrice' => 700, 'pagePrice' => 500],
            ],
            '25x25' => [
                'Твердый' => ['coverPrice' => 2500, 'pagePrice' => 900],
                'Мягкий' => ['coverPrice' => 1500, 'pagePrice' => 900],
            ],
            '30x30' => [
                'Твердый' => ['coverPrice' => 2500, 'pagePrice' => 1000],
                'Мягкий' => ['coverPrice' => 1500, 'pagePrice' => 1000],
            ],
        ],
        'Журнал' => [
            '20x30' => [
                'Твердый' => ['coverPrice' => 1500, 'pagePrice' => 150],
            ],
            '20x20' => [
                'Твердый' => ['coverPrice' => 1500, 'pagePrice' => 150],
            ],
            '25x25' => [
                'Твердый' => ['coverPrice' => 2500, 'pagePrice' => 200],
            ],
            '30x30' => [
                'Твердый' => ['coverPrice' => 2500, 'pagePrice' => 300],
            ],
        ],
        'Кожаный' => [
            '20x30' => [
                'Кожаный' => ['coverPrice' => 3500, 'pagePrice' => 500],
            ],
            '20x20' => [
                'Кожаный' => ['coverPrice' => 3500, 'pagePrice' => 500],
            ],
            '25x25' => [
                'Кожаный' => ['coverPrice' => 4000, 'pagePrice' => 900],
            ],
            '30x30' => [
                'Кожаный' => ['coverPrice' => 4000, 'pagePrice' => 1000],
            ],
        ],
    ];

    /**
     * @var array<int, int>
     */
    private const PORTRAIT_RULES = [
        2 => 500,
        3 => 600,
        4 => 700,
        5 => 800,
        6 => 900,
        7 => 1000,
    ];

    /**
     * @return array<int, array{
     *     albumType: string,
     *     albumSize: string,
     *     coverType: string,
     *     coverPrice: int,
     *     pagePrice: int,
     *     pageCountUnit: string
     * }>
     */
    public function albumRules(): array
    {
        $rules = [];

        foreach (Project::ALBUM_TYPES as $albumType) {
            foreach (Project::ALBUM_SIZES as $albumSize) {
                foreach (Project::coverTypesForAlbumType($albumType) as $coverType) {
                    $rule = self::ALBUM_RULES[$albumType][$albumSize][$coverType] ?? null;

                    if ($rule === null) {
                        continue;
                    }

                    $rules[] = [
                        'albumType' => $albumType,
                        'albumSize' => $albumSize,
                        'coverType' => $coverType,
                        'coverPrice' => $rule['coverPrice'],
                        'pagePrice' => $rule['pagePrice'],
                        'pageCountUnit' => Project::pageCountUnitForAlbumType($albumType),
                    ];
                }
            }
        }

        return $rules;
    }

    /**
     * @return array<int, array{portraitCount: int, extraPrice: int}>
     */
    public function portraitRules(): array
    {
        $rules = [];

        foreach (self::PORTRAIT_RULES as $portraitCount => $extraPrice) {
            $rules[] = [
                'portraitCount' => $portraitCount,
                'extraPrice' => $extraPrice,
            ];
        }

        return $rules;
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array{
     *     albumType: string,
     *     albumSize: string,
     *     coverType: string,
     *     coverPrice: int,
     *     pagePrice: int,
     *     pageCountUnit: string
     * }|null
     */
    public function resolveAlbumRule(array $attributes): ?array
    {
        $albumType = $attributes['album_type'] ?? null;
        $albumSize = $attributes['album_size'] ?? null;
        $coverType = $attributes['cover_type'] ?? null;

        if (! is_string($albumType) || ! is_string($albumSize) || ! is_string($coverType)) {
            return null;
        }

        $rule = self::ALBUM_RULES[$albumType][$albumSize][$coverType] ?? null;

        if ($rule === null) {
            return null;
        }

        return [
            'albumType' => $albumType,
            'albumSize' => $albumSize,
            'coverType' => $coverType,
            'coverPrice' => $rule['coverPrice'],
            'pagePrice' => $rule['pagePrice'],
            'pageCountUnit' => Project::pageCountUnitForAlbumType($albumType),
        ];
    }

    public function resolvePortraitExtraPrice(int $portraitCount): int
    {
        if ($portraitCount <= 1) {
            return 0;
        }

        return self::PORTRAIT_RULES[$portraitCount] ?? 0;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function calculateUnitPrice(array $attributes): ?int
    {
        $albumRule = $this->resolveAlbumRule($attributes);

        if ($albumRule === null) {
            return null;
        }

        return $albumRule['coverPrice']
            + ((int) ($attributes['page_count'] ?? 0) * $albumRule['pagePrice'])
            + $this->resolvePortraitExtraPrice((int) ($attributes['portrait_count'] ?? 0));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function calculateTotalPrice(array $attributes): ?string
    {
        $unitPrice = $this->calculateUnitPrice($attributes);

        if ($unitPrice === null) {
            return null;
        }

        return number_format($unitPrice * (int) ($attributes['print_quantity'] ?? 0), 2, '.', '');
    }

    public function ruleCount(): int
    {
        return count($this->albumRules()) + count($this->portraitRules());
    }
}
