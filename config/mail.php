<?php

return [
    'resend_key' => env('RESEND_API_KEY'),
    'default' => env('MAIL_MAILER', 'log'),
    'mailers' => [
        'log' => ['transport' => 'log'],
        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 587),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => 8,
        ],
    ],
    'from' => ['address' => env('MAIL_FROM_ADDRESS', 'tickets@example.test'), 'name' => 'EntryPass'],
];
