<?php

use App\Http\Controllers\PublicEventController;
use App\Http\Controllers\StaffController;
use App\Http\Middleware\OrganizerOnly;
use Illuminate\Support\Facades\Route;

Route::prefix('data')->group(function () {
    Route::get('/events', [PublicEventController::class, 'index']);
    Route::get('/events/{event}', [PublicEventController::class, 'show']);
    Route::post('/events/{event}/register', [PublicEventController::class, 'register'])->middleware('throttle:20,1');
    Route::post('/tickets/lookup', [PublicEventController::class, 'lookup'])->middleware('throttle:10,1');
    Route::post('/tickets/cancel', [PublicEventController::class, 'cancel'])->middleware('throttle:10,1');
    Route::post('/staff/login', [StaffController::class, 'login'])->middleware('throttle:10,1');

    Route::prefix('staff')->middleware('auth')->group(function () {
        Route::post('/logout', [StaffController::class, 'logout']);
        Route::get('/events', [StaffController::class, 'events']);
        Route::post('/events/{event}/check-in', [StaffController::class, 'checkIn'])->middleware('throttle:120,1');

        Route::middleware(OrganizerOnly::class)->group(function () {
            Route::get('/events/{event}', [StaffController::class, 'event']);
            Route::post('/events', [StaffController::class, 'saveEvent']);
            Route::post('/events/{event}', [StaffController::class, 'saveEvent']);
            Route::get('/events/{event}/attendees', [StaffController::class, 'attendees']);
            Route::get('/events/{event}/export', [StaffController::class, 'export']);
            Route::post('/events/{event}/promote', [StaffController::class, 'promote']);
            Route::post('/events/{event}/registrations/{registration}/cancel', [StaffController::class, 'cancel']);
            Route::post('/events/{event}/registrations/{registration}/undo', [StaffController::class, 'undo']);
            Route::get('/audit', [StaffController::class, 'audit']);
            Route::get('/accounts', [StaffController::class, 'accounts']);
            Route::post('/accounts', [StaffController::class, 'createAccount']);
        });
    });
});

Route::view('/', 'app');
Route::view('/events/{event}', 'app')->whereNumber('event');
Route::view('/tickets', 'app');
Route::view('/entrypass-staff', 'app')->name('staff.login');
Route::middleware('auth')->group(function () {
    Route::view('/staff', 'app');
    Route::view('/staff/events/{event}/check-in', 'app')->whereNumber('event');
    Route::middleware(OrganizerOnly::class)->group(function () {
        Route::view('/staff/events/new', 'app');
        Route::view('/staff/events/{event}/{page}', 'app')->whereNumber('event')->whereIn('page', ['attendees', 'edit']);
        Route::view('/staff/audit', 'app');
        Route::view('/staff/accounts', 'app');
    });
});
