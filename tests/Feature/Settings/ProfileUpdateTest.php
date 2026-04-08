<?php

use App\Models\City;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page is displayed', function () {
    $city = City::factory()->create([
        'name' => 'Алматы',
    ]);

    $user = User::factory()->create([
        'city_id' => $city->id,
        'instagram_url' => 'https://instagram.com/test.user',
    ]);

    $this->actingAs($user)
        ->get(route('profile.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('profile/show')
            ->has('cities', 1)
            ->where('user.city_id', $city->id)
            ->where('user.city_name', 'Алматы')
            ->where('user.phone', $user->phone)
            ->where('user.name', $user->name),
        );
});

test('guests are redirected to login when opening profile page', function () {
    $this->get(route('profile.show'))
        ->assertRedirect(route('login'));
});

test('profile page includes the authenticated user phone number', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('profile.show'))
        ->assertSee($user->phone);
});

test('authenticated users can update their profile information', function () {
    $oldCity = City::factory()->create([
        'name' => 'Алматы',
    ]);
    $newCity = City::factory()->create([
        'name' => 'Астана',
    ]);

    $user = User::factory()->create([
        'city_id' => $oldCity->id,
        'name' => 'Старое имя',
        'phone' => '+77011234567',
        'instagram_url' => 'https://instagram.com/old.profile',
    ]);

    $this->actingAs($user)
        ->put(route('profile.update'), [
            'city_id' => $newCity->id,
            'name' => 'Новое имя',
            'phone' => '+7 777 123 45 67',
            'instagram_url' => 'https://www.instagram.com/new.profile/',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.show'))
        ->assertSessionHas('status', 'Профиль обновлен.');

    $user->refresh();

    expect($user->name)->toBe('Новое имя')
        ->and($user->city_id)->toBe($newCity->id)
        ->and($user->phone)->toBe('+77771234567')
        ->and($user->instagram_url)->toBe('https://www.instagram.com/new.profile');
});

test('profile information update validates instagram url', function () {
    $city = City::factory()->create([
        'name' => 'Алматы',
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.show'))
        ->put(route('profile.update'), [
            'city_id' => $city->id,
            'name' => 'Имя',
            'phone' => '+77011234567',
            'instagram_url' => 'https://example.com/profile',
        ])
        ->assertSessionHasErrors(['instagram_url'])
        ->assertRedirect(route('profile.show'));
});
