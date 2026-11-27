<?php

use App\Models\StaffUser;
use Illuminate\Support\Facades\Artisan;

Artisan::command('entrypass:bootstrap-organizer', function () {
    $password = config('app.initial_organizer_password');
    if (! $password || StaffUser::where('role', 'organizer')->exists()) {
        return 0;
    }
    if (strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0")) {
        $this->error('INITIAL_ORGANIZER_PASSWORD must contain 12 to 72 bytes and no null characters.');
        return 1;
    }

    StaffUser::create([
        'name' => 'EntryPass Organizer',
        'username' => 'organizer',
        'role' => 'organizer',
        'password' => $password,
    ]);
    $this->info('Created the organizer account. Remove INITIAL_ORGANIZER_PASSWORD from the hosting settings.');
    return 0;
});

Artisan::command('entrypass:reset-organizer {username?}', function () {
    $username = $this->argument('username');
    $organizers = StaffUser::where('role', 'organizer');

    if ($username === null) {
        $this->table(['Organizer username'], $organizers->orderBy('username')->get(['username'])->toArray());
        return 0;
    }

    $account = $organizers->where('username', $username)->first();
    if (!$account) {
        $this->error('Organizer account not found.');
        return 1;
    }

    $password = $this->secret('New password');
    if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0")) {
        $this->error('The password must contain 12 to 72 bytes and no null characters.');
        return 1;
    }

    if ($password !== $this->secret('Confirm new password')) {
        $this->error('Passwords do not match.');
        return 1;
    }

    $account->update(['password' => $password]);
    $this->info('Organizer password updated.');
    return 0;
});
