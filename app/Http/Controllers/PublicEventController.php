<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Registration;
use App\Services\Bookings;
use App\Services\TicketMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PublicEventController
{
    public function index()
    {
        return Event::where('status', 'published')->where('ends_at', '>', now())
            ->withCount('occupiedSpots as registrations_count')->orderBy('starts_at')->get();
    }

    public function show(Event $event)
    {
        abort_unless($event->status === 'published', 404);
        $event->setAttribute('occupied_seats', $event->occupiedSpots()->whereNotNull('seat')->pluck('seat'));
        return $event->loadCount([
            'occupiedSpots as registrations_count',
            'registrations as waitlisted_count' => fn ($query) => $query->where('status', 'waitlisted'),
        ]);
    }

    public function register(Request $request, Event $event)
    {
        abort_unless($event->status === 'published', 404);
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email:rfc', 'max:254'],
            'mobile' => ['required', 'string', 'regex:/^09[0-9]{9}$/D'],
        ], ['mobile.regex' => 'Enter an 11-digit Philippine mobile number starting with 09.']);

        $data['email'] = strtolower($data['email']);
        $registration = DB::transaction(function () use ($event, $data, $request) {
            $event = Event::lockForUpdate()->findOrFail($event->id);
            if ($event->status !== 'published' || $event->ends_at->lte(now())) {
                throw ValidationException::withMessages(['registration' => 'Registration has closed for this event.']);
            }

            if ($event->registrations()->where('email', $data['email'])->where('status', '<>', 'cancelled')->exists()) {
                throw ValidationException::withMessages(['email' => 'This email is already registered. Use Find ticket to recover it.']);
            }

            $waitlist = $event->registrations()->where('status', 'waitlisted');
            $waitlistOnly = $event->occupiedSpots()->count() >= $event->capacity || $waitlist->exists();
            if ($waitlistOnly && ! $request->boolean('join_waitlist')) {
                throw ValidationException::withMessages(['waitlist' => 'Confirmed spots are unavailable. Submit again to join the waitlist.']);
            }

            if (!$waitlistOnly && (int) $event->capacity === 30) {
                $seat = $request->validate(['seat' => ['required', 'string', 'regex:/^[A-F][1-5]$/D']])['seat'];
                if ($event->occupiedSpots()->where('seat', $seat)->exists()) {
                    throw ValidationException::withMessages(['seat' => 'This seat has been reserved. Please choose another.']);
                }
                $data['seat'] = $seat;
            }
            return $event->registrations()->create($data + [
                'ticket_code' => Registration::newTicketCode(),
                'status' => $waitlistOnly ? 'waitlisted' : 'confirmed',
                'registered_at' => now(),
            ]);
        });

        $ticket = $this->ticket($registration);
        TicketMail::send($registration);
        return response()->json($ticket, 201)->header('Cache-Control', 'no-store');
    }

    public function lookup(Request $request)
    {
        return response()->json($this->ticket($this->findTicket($request)))
            ->header('Cache-Control', 'no-store');
    }

    public function cancel(Request $request)
    {
        $registration = $this->findTicket($request);
        Bookings::cancel($registration->event, $registration->id, null);
        return response()->json($this->ticket($registration->refresh()))->header('Cache-Control', 'no-store');
    }

    private function findTicket(Request $request): Registration
    {
        $data = $request->validate([
            'ticket_code' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:254'],
        ]);
        $registration = Registration::where('ticket_code', strtoupper($data['ticket_code']))
            ->where('email', strtolower($data['email']))->first();

        abort_unless($registration, 404, 'Ticket not found');
        return $registration;
    }

    private function ticket(Registration $registration): array
    {
        $event = $registration->event;
        $position = $registration->status === 'waitlisted'
            ? $event->registrations()->where('status', 'waitlisted')->where('id', '<=', $registration->id)->count()
            : null;

        return [
            'full_name' => $registration->full_name,
            'ticket_code' => $registration->ticket_code,
            'status' => $registration->status,
            'seat' => $registration->seat,
            'email' => $registration->email,
            'mobile' => $registration->mobile,
            'waitlist_position' => $position,
            'event' => $event->only(['title', 'venue', 'starts_at', 'ends_at']),
        ];
    }
}
