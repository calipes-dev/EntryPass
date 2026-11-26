<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware) {
        if (getenv('TRUST_RENDER_PROXY') === 'true') {
            $middleware->trustProxies(at: '*', headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO);
        }
        $middleware->redirectGuestsTo(fn (Request $request) => route('staff.login'));
    })
    ->withExceptions(function (Illuminate\Foundation\Configuration\Exceptions $exceptions) {
        if (getenv('VERCEL') !== '1') {
            return;
        }

        $exceptions->report(function (Throwable $error) {
            $summary = 'EntryPass runtime error: '.$error::class;

            if ($error instanceof Illuminate\Database\QueryException) {
                $summary .= ' SQLSTATE='.$error->getCode();
                if (str_contains($error->getMessage(), 'relation "sessions" does not exist')) {
                    $summary .= ' (missing sessions table)';
                }
            }

            error_log($summary);
        });
    })
    ->create();
