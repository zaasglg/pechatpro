<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SESSION_KEY = 'locale';

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $supportedLocales = array_keys(config('app.supported_locales', []));
        $defaultLocale = config('app.frontend_locale', 'ru');
        $sessionLocale = $request->session()->get(self::SESSION_KEY);

        $locale = in_array($sessionLocale, $supportedLocales, true)
            ? $sessionLocale
            : $defaultLocale;

        App::setLocale($locale);

        return $next($request);
    }
}
