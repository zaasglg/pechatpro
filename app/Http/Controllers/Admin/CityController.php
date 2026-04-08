<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCityRequest;
use App\Http\Requests\UpdateCityRequest;
use App\Models\City;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CityController extends Controller
{
    /**
     * Display the city management page.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('admin/cities/index', [
            'cities' => City::query()
                ->withCount('users')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (City $city): array => [
                    'id' => $city->id,
                    'name' => $city->name,
                    'usersCount' => $city->users_count,
                ])
                ->values(),
            'error' => $request->session()->get('error'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Store a newly created city.
     */
    public function store(StoreCityRequest $request): RedirectResponse
    {
        $city = City::query()->create($request->validated());

        return to_route('admin.cities.index')
            ->with('status', "Город {$city->name} добавлен.");
    }

    /**
     * Update the specified city.
     */
    public function update(UpdateCityRequest $request, City $city): RedirectResponse
    {
        $city->update($request->validated());

        return to_route('admin.cities.index')
            ->with('status', "Город {$city->name} обновлен.");
    }

    /**
     * Remove the specified city.
     */
    public function destroy(City $city): RedirectResponse
    {
        if ($city->users()->exists()) {
            return to_route('admin.cities.index')
                ->with('error', "Город {$city->name} нельзя удалить, пока он назначен пользователям.");
        }

        $cityName = $city->name;
        $city->delete();

        return to_route('admin.cities.index')
            ->with('status', "Город {$cityName} удален.");
    }
}
