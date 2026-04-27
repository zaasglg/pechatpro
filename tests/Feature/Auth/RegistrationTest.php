<?php

use App\Models\City;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();
    $this->city = City::factory()->create([
        'name' => 'Алматы',
    ]);
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->has('cities', 1)
            ->where('cities.0.id', $this->city->id)
            ->where('cities.0.name', 'Алматы'),
        );
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'city_id' => $this->city->id,
        'name' => 'Test User',
        'phone' => '+77011234567',
        'instagram_url' => 'https://instagram.com/test.user',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertGuest();
    $response->assertRedirect(route('register', absolute: false));
});

test('new users are stored with a normalized phone number', function () {
    $this->post(route('register.store'), [
        'city_id' => $this->city->id,
        'name' => 'Masked User',
        'phone' => '+7 701 123 45 67',
        'instagram_url' => 'https://www.instagram.com/masked.user/',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('register', absolute: false));

    expect(User::query()->where('phone', '+77011234567')->exists())->toBeTrue();
});

test('new users are stored with a normalized instagram profile link', function () {
    $this->post(route('register.store'), [
        'city_id' => $this->city->id,
        'name' => 'Instagram User',
        'phone' => '+77011234568',
        'instagram_url' => 'https://www.instagram.com/instagram.user/',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('register', absolute: false));

    $user = User::query()->where('phone', '+77011234568')->firstOrFail();

    expect($user->instagram_url)->toBe('https://www.instagram.com/instagram.user');
});

test('new users receive the photographer role after registration', function () {
    $this->post(route('register.store'), [
        'city_id' => $this->city->id,
        'name' => 'Role User',
        'phone' => '+77017778899',
        'instagram_url' => 'https://instagram.com/role.user',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('register', absolute: false));

    $user = User::query()->where('phone', '+77017778899')->firstOrFail();

    expect($user->hasRole('Фотограф'))->toBeTrue();
    expect($user->approved_at)->toBeNull();
    expect($user->city_id)->toBe($this->city->id);
});

test('registration can be completed without an instagram profile link', function () {
    $response = $this->post(route('register.store'), [
        'city_id' => $this->city->id,
        'name' => 'No Instagram User',
        'phone' => '+77010001122',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertRedirect(route('register', absolute: false));

    $user = User::query()->where('phone', '+77010001122')->firstOrFail();

    expect($user->instagram_url)->toBeNull();
});

test('registration requires an instagram profile url', function () {
    $response = $this->from(route('register'))->post(route('register.store'), [
        'city_id' => $this->city->id,
        'name' => 'Wrong Instagram User',
        'phone' => '+77010001123',
        'instagram_url' => 'https://example.com/profile',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response
        ->assertRedirect(route('register', absolute: false))
        ->assertSessionHasErrors(['instagram_url']);

    expect(User::query()->where('phone', '+77010001123')->exists())->toBeFalse();
});

test('registration requires city selection', function () {
    $response = $this->from(route('register'))->post(route('register.store'), [
        'name' => 'No City User',
        'phone' => '+77010001124',
        'instagram_url' => 'https://instagram.com/no.city',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response
        ->assertRedirect(route('register', absolute: false))
        ->assertSessionHasErrors(['city_id']);
});

test('register screen receives pending approval state from the session', function () {
    $this->withSession([
        'registration_pending_approval' => true,
        'registration_pending_approval_token' => 'test-token',
    ])->get(route('register'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('registrationPendingApproval', true)
            ->where('registrationPendingApprovalToken', 'test-token'),
        );
});
