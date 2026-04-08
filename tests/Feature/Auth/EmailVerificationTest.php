<?php

use Laravel\Fortify\Features;

test('verification feature is disabled for phone authentication', function () {
    expect(Features::enabled(Features::emailVerification()))->toBeFalse();
    $this->get('/email/verify')->assertNotFound();
});

test('verification endpoints are unavailable', function () {
    $this->get('/email/verify/1/test-hash')->assertNotFound();
});
