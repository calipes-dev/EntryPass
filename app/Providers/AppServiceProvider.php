<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if (defined('ENTRYPASS_VERCEL_ENTRY')) {
            Vite::createAssetPathsUsing(fn (string $path) => '/'.ltrim($path, '/'));
        }

        if (str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
