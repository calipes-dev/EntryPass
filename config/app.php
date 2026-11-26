<?php

return [
    'name' => env('APP_NAME', 'EntryPass'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => 'Asia/Manila',
    'locale' => 'en',
    'fallback_locale' => 'en',
    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'initial_organizer_password' => env('INITIAL_ORGANIZER_PASSWORD'),
    'demo_staff_password' => env('DEMO_STAFF_PASSWORD'),
];
