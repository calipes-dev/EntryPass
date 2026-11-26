<?php

return [
    'default' => env('DB_CONNECTION', 'pgsql'),
    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'entrypass'),
            'username' => env('DB_USERNAME', 'entrypass'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'search_path' => 'public',
            'timezone' => 'Asia/Manila',
            'sslmode' => env('DB_SSLMODE', 'prefer'),
        ],
    ],
    'migrations' => ['table' => 'migrations'],
];
