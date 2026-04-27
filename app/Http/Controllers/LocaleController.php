<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $supportedLocales = array_keys(config('app.supported_locales', []));

        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in($supportedLocales)],
        ]);

        $request->session()->put('locale', $validated['locale']);

        return back();
    }
}
