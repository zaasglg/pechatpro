<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\ProjectPricingCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectPriceController extends Controller
{
    public function index(
        Request $request,
        ProjectPricingCalculator $pricingCalculator,
    ): Response {
        return Inertia::render('admin/project-prices/index', [
            'albumPricingRules' => $pricingCalculator->albumRules(),
            'portraitPricingRules' => $pricingCalculator->portraitRules(),
            'status' => $request->session()->get('status'),
        ]);
    }
}
