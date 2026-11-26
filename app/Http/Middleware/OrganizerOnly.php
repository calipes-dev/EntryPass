<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class OrganizerOnly
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->role === 'organizer', 403);
        return $next($request);
    }
}
