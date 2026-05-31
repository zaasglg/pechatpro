<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Support\ProjectPricingCalculator;
use Inertia\Inertia;
use Inertia\Response;

class PriceCalculatorController extends Controller
{
    public function __invoke(ProjectPricingCalculator $pricingCalculator): Response
    {
        return Inertia::render('price-calculator', [
            'classOptions' => Project::CLASS_OPTIONS,
            'albumTypes' => Project::ALBUM_TYPES,
            'albumSizes' => Project::ALBUM_SIZES,
            'coverTypesByAlbumType' => Project::COVER_TYPES_BY_ALBUM_TYPE,
            'pageCountOptionsByAlbumType' => Project::PAGE_COUNT_OPTIONS_BY_ALBUM_TYPE,
            'pageCountUnitsByAlbumType' => Project::PAGE_COUNT_UNITS_BY_ALBUM_TYPE,
            'albumPricingRules' => $pricingCalculator->albumRules(),
            'portraitPricingRules' => $pricingCalculator->portraitRules(),
        ]);
    }
}
