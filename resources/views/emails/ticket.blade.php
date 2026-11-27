<!doctype html>
<html lang="en">
<body style="font-family:Arial,sans-serif;color:#15372a">
    <h1>EntryPass</h1>
    <p>Hello {{ $registration->full_name }},</p>
    <p>{{ $status }}</p>
    <h2>{{ $event->title }}</h2>
    <p><strong>Venue:</strong> {{ $event->venue }}<br>
        <strong>Starts:</strong> {{ $start }} PHT<br>
        <strong>Ends:</strong> {{ $end }} PHT<br>
        <strong>Admission:</strong> Free<br>
        @if ($registration->seat)
            <strong>Seat:</strong> {{ $registration->seat }}<br>
        @endif
        <strong>Ticket code:</strong> {{ $registration->ticket_code }}
    </p>
    @if ($qr)
        <p><img src="{{ $message->embedData($qr, 'ticket-qr.png', 'image/png') }}" width="240" height="240"
            alt="Ticket QR code"></p>
        <p>Show this QR code at check-in.</p>
    @endif
    <p><a href="{{ $link }}">Open your ticket</a> using the email address you registered with.</p>
</body>
</html>
