<?php

use Laravel\Fortify\Features;

test('password reset feature is disabled for phone authentication', function () {
    expect(Features::enabled(Features::resetPasswords()))->toBeFalse();
    $this->get('/forgot-password')->assertNotFound();
});

test('password reset endpoints are unavailable', function () {
    $this->post('/forgot-password', [
        'phone' => '+77011234567',
    ])->assertNotFound();

    $this->get('/reset-password/test-token')->assertNotFound();
    $this->post('/reset-password', [
        'token' => 'test-token',
        'phone' => '+77011234567',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();
});
