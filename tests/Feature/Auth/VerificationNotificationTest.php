<?php

use App\Models\User;

test('verification notification endpoint is unavailable', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/email/verification-notification')
        ->assertNotFound();
});
