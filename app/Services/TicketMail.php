<?php

namespace App\Services;

use App\Models\Registration;
use Illuminate\Support\Facades\Mail;
use Throwable;

class TicketMail
{
    public static function send(Registration $registration, bool $promoted = false): void
    {
        $event = $registration->event;
        $link = rtrim(config('app.url'), '/').'/tickets?code='.rawurlencode($registration->ticket_code);
        $status = $registration->status === 'waitlisted'
            ? 'You joined the waitlist. A confirmed ticket is required for entry.'
            : ($promoted ? 'Your waitlist spot was promoted. Your ticket is confirmed.' : 'Your ticket is confirmed.');
        $start = $event->starts_at->format('M j, Y g:i A');
        $end = $event->ends_at->format('M j, Y g:i A');
        $body = "Hello {$registration->full_name},\n\n{$status}\n\n{$event->title}\n{$event->venue}\n{$start} to {$end} PHT\nTicket code: {$registration->ticket_code}\n\nOpen your ticket with the email you registered with:\n{$link}";

        $subject = ($promoted ? 'Waitlist promotion' : 'EntryPass registration').' | '.$event->title;
        try {
            Mail::raw($body, function ($message) use ($registration, $subject) {
                $message->to($registration->email)->subject($subject);
            });
        } catch (Throwable $error) {
            // The registration is already committed. Report delivery failure without inviting a duplicate booking.
            if (config('mail.default') === 'smtp') {
                // Symfony exposes the SMTP reply code without requiring us to log its response body.
                error_log('EntryPass SMTP delivery failed: '.$error::class.' (code '.$error->getCode().')');
                return;
            }

            report($error);
        }
    }
}
