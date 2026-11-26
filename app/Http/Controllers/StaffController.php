<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Event;
use App\Models\Registration;
use App\Models\StaffUser;
use App\Services\Bookings;
use App\Services\TicketMail;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StaffController
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:72'],
        ]);
        if (strlen($credentials['password']) > 72 || str_contains($credentials['password'], "\0") || ! Auth::attempt($credentials)) {
            throw ValidationException::withMessages(['username' => 'The username or password is incorrect.']);
        }

        $request->session()->regenerate();
        return response()->json(['csrfToken' => $request->session()->token()]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->noContent();
    }

    public function events(Request $request)
    {
        $organizer = $request->user()->role === 'organizer';
        $events = Event::query()->orderBy('starts_at');
        if ($organizer) {
            $events->withCount(Event::staffCounts());
        } else {
            $events->whereIn('status', ['published', 'closed'])->withCount([
                'occupiedSpots as registrations_count',
                'registrations as checked_in_count' => fn ($query) => $query->where('status', 'checked_in'),
            ]);
        }

        return response()->json(['organizer' => $organizer, 'events' => $events->get()])
            ->header('Cache-Control', 'no-store');
    }

    public function event(Event $event)
    {
        return $event;
    }

    public function saveEvent(Request $request, ?Event $event = null)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:2000'],
            'venue' => ['required', 'string', 'max:200'],
            'starts_at' => ['required', 'date_format:Y-m-d\TH:i'],
            'ends_at' => ['required', 'date_format:Y-m-d\TH:i', 'after:starts_at'],
            'capacity' => ['required', 'integer', 'min:1', 'max:100000'],
            'status' => ['required', 'in:draft,published,closed'],
        ]);

        return DB::transaction(function () use ($request, $event, $data) {
            $record = $event ? Event::lockForUpdate()->findOrFail($event->id) : new Event;
            if ($record->exists && (int) $record->capacity !== (int) $data['capacity'] && in_array(30, [(int) $record->capacity, (int) $data['capacity']], true) && $record->occupiedSpots()->exists()) {
                throw ValidationException::withMessages(['capacity' => 'The room layout cannot change while seats are booked.']);
            }
            if ($record->exists && $record->occupiedSpots()->count() > $data['capacity']) {
                throw ValidationException::withMessages(['capacity' => 'Capacity cannot be lower than the number of confirmed and checked-in attendees.']);
            }

            $action = $record->exists ? 'event.updated' : 'event.created';
            $record->fill($data)->save();
            AuditLog::record($request->user()->id, $action, 'event', $record->id);
            return response()->json($record, $event ? 200 : 201);
        });
    }

    public function attendees(Event $event)
    {
        return response()->json([
            'event' => $event->loadCount(Event::staffCounts()),
            'attendees' => $event->registrations()->orderBy('id')->get(),
        ])->header('Cache-Control', 'no-store');
    }

    public function checkIn(Request $request, Event $event)
    {
        $data = $request->validate(['ticket_code' => ['required', 'string', 'max:100']]);

        return DB::transaction(function () use ($request, $event, $data) {
            $event = Event::lockForUpdate()->findOrFail($event->id);
            $registration = $event->registrations()
                ->where('ticket_code', strtoupper($data['ticket_code']))->lockForUpdate()->first();

            if (! $registration || $event->status === 'draft') {
                return ['status' => 'invalid'];
            }
            if ($registration->status === 'checked_in') {
                return ['status' => 'already_checked_in', 'checked_in_at' => $registration->checked_in_at];
            }
            if (in_array($registration->status, ['waitlisted', 'cancelled'], true)) {
                return ['status' => $registration->status];
            }
            if ($registration->status !== 'confirmed') {
                return ['status' => 'invalid'];
            }

            $checkedInAt = now();
            if (! $event->starts_at->isSameDay($checkedInAt)) {
                return ['status' => 'wrong_day'];
            }

            $registration->status = 'checked_in';
            $registration->checked_in_at = $checkedInAt;
            $registration->checked_in_by = $request->user()->id;
            $registration->save();
            AuditLog::record($request->user()->id, 'registration.checked_in', 'registration', $registration->id);

            return [
                'status' => 'checked_in',
                'full_name' => $registration->full_name,
                'checked_in_count' => $event->registrations()->where('status', 'checked_in')->count(),
                'registrations_count' => $event->occupiedSpots()->count(),
            ];
        });
    }

    public function cancel(Request $request, Event $event, Registration $registration)
    {
        Bookings::cancel($event, $registration->id, $request->user()->id);
        return response()->noContent();
    }

    public function promote(Request $request, Event $event)
    {
        $registration = DB::transaction(function () use ($request, $event) {
            $event = Event::lockForUpdate()->findOrFail($event->id);
            if ($event->status !== 'published' || $event->ends_at->lte(now()) || $event->occupiedSpots()->count() >= $event->capacity) {
                throw ValidationException::withMessages(['registration' => 'Promotion requires an active published event with an available spot.']);
            }

            $registration = $event->registrations()->where('status', 'waitlisted')->orderBy('id')->lockForUpdate()->first();
            if (! $registration) {
                throw ValidationException::withMessages(['registration' => 'The waitlist is empty.']);
            }

            $registration->status = 'confirmed';
            $registration->save();
            if ((int) $event->capacity === 30) {
                $taken = $event->occupiedSpots()->pluck('seat')->all();
                foreach (range('A','F') as $table) {
                    foreach (range(1,5) as $number) {
                        if (!in_array($table.$number, $taken, true)) {
                            $registration->update(['seat' => $table.$number]);
                            break 2;
                        }
                    }
                }
            }
            AuditLog::record($request->user()->id, 'registration.promoted', 'registration', $registration->id);
            return $registration;
        });

        TicketMail::send($registration, promoted: true);
        return response()->noContent();
    }

    public function undo(Request $request, Event $event, Registration $registration)
    {
        DB::transaction(function () use ($request, $event, $registration) {
            Event::lockForUpdate()->findOrFail($event->id);
            $registration = $event->registrations()->lockForUpdate()->findOrFail($registration->id);
            if ($registration->status !== 'checked_in') {
                throw ValidationException::withMessages(['registration' => 'This registration is not checked in.']);
            }

            $registration->status = 'confirmed';
            $registration->checked_in_at = null;
            $registration->checked_in_by = null;
            $registration->save();
            AuditLog::record($request->user()->id, 'registration.check_in_undone', 'registration', $registration->id);
        });

        return response()->noContent();
    }

    public function export(Event $event)
    {
        return response()->streamDownload(function () use ($event) {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Name', 'Email', 'Mobile', 'Ticket code', 'Status', 'Registered at (PHT)', 'Checked in at (PHT)'], ',', '"', '');
            foreach ($event->registrations()->orderBy('id')->cursor() as $person) {
                $row = [
                    $person->full_name, $person->email, $person->mobile, $person->ticket_code, $person->status,
                    $person->registered_at->format('Y-m-d H:i:s'), $person->checked_in_at?->format('Y-m-d H:i:s') ?? '',
                ];
                $row = array_map(fn ($value) => preg_match('/^\s*[=+@-]|^[\t\r\n]/u', $value) ? "'".$value : $value, $row);
                fputcsv($stream, $row, ',', '"', '');
            }
            fclose($stream);
        }, 'entrypass-event-'.$event->id.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }

    public function audit()
    {
        $entries = DB::table('audit_logs')
            ->leftJoin('staff_users', 'staff_users.id', '=', 'audit_logs.staff_user_id')
            ->orderByDesc('audit_logs.id')->limit(200)
            ->get(['audit_logs.*', 'staff_users.name as staff_name']);
        foreach ($entries as $entry) {
            $entry->created_at = Carbon::parse($entry->created_at)->toIso8601String();
        }

        return response()->json($entries)->header('Cache-Control', 'no-store');
    }

    public function accounts()
    {
        return response()->json(StaffUser::orderBy('name')->get(['id', 'name', 'username', 'role']))
            ->header('Cache-Control', 'no-store');
    }

    public function createAccount(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'alpha_dash:ascii', 'max:100', 'unique:staff_users,username'],
            'password' => ['required', 'string', 'min:12', 'max:72', function ($attribute, $value, $fail) {
                if (strlen($value) > 72 || str_contains($value, "\0")) {
                    $fail('Use a password of up to 72 bytes without null characters.');
                }
            }],
            'role' => ['required', 'in:organizer,door_staff'],
        ]);
        return DB::transaction(function () use ($request, $data) {
            $account = StaffUser::create($data);
            AuditLog::record($request->user()->id, 'staff.created', 'staff_user', $account->id);
            return response()->json($account, 201);
        });
    }
}
