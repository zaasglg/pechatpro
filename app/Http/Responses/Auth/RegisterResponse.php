<?php

namespace App\Http\Responses\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  Request  $request
     */
    public function toResponse($request)
    {
        Auth::guard(config('fortify.guard'))->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $request->wantsJson()
            ? new JsonResponse([
                'message' => 'Регистрация принята. Ждите подтверждения аккаунта.',
            ], 201)
            : redirect()
                ->route('register')
                ->with([
                    'registration_pending_approval' => true,
                    'registration_pending_approval_token' => Str::uuid()->toString(),
                ]);
    }
}
