<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PhotographerApprovalController extends Controller
{
    /**
     * Show photographers waiting for admin approval.
     */
    public function index(Request $request): Response
    {
        $pendingPhotographers = User::query()
            ->whereNull('approved_at')
            ->whereHas('roles', function ($query): void {
                $query->where('name', 'Фотограф');
            })
            ->orderBy('created_at')
            ->get(['id', 'name', 'phone', 'created_at'])
            ->map(fn (User $photographer): array => [
                'id' => $photographer->id,
                'name' => $photographer->name,
                'phone' => $photographer->phone,
                'registeredAt' => $photographer->created_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('admin/photographer-approvals/index', [
            'pendingPhotographers' => $pendingPhotographers,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Approve a photographer account.
     */
    public function approve(User $user): RedirectResponse
    {
        abort_if(! $user->hasRole('Фотограф'), 404);

        if (! $user->isApproved()) {
            $user->approve();
        }

        return to_route('admin.photographer-approvals.index')
            ->with('status', "Фотограф {$user->name} подтвержден.");
    }
}
