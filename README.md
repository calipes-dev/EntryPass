# EntryPass

EntryPass is a free event registration and QR check-in app for Cebu events. It uses Laravel 12, React, Bootstrap 5, Vite, and PostgreSQL. It implements the Level 1 and Level 2 flows and the Level 3 camera, concurrency, ticket security, email, and staff-role features. The HTTPS deployment configuration is included. The hosted site and runtime acceptance checks are pending.

## Run locally on Windows

1. Install PHP 8.2 or newer with `pdo_pgsql`, Composer 2, Node.js 22 LTS or newer, and PostgreSQL. If you use WampServer, `php --ini` shows the configuration file to edit for the command-line PHP.
2. Create an `entrypass` database and PostgreSQL login in pgAdmin. Make that login the database owner. Run these commands in the repository from PowerShell:

   ```powershell
   Copy-Item .env.example .env
   composer install
   npm install
   php artisan key:generate
   ```

3. Set the `DB_*` values in `.env` to match PostgreSQL. Then run:

   ```powershell
   php artisan migrate --seed
   npm run build
   php artisan serve --host=localhost
   ```

4. Open [http://localhost:8000](http://localhost:8000). For live React changes, run `npm run dev` in a second terminal while Laravel is running. If a Level 1 database already exists, use the same migration command to upgrade it and seed the door account.

Both local demo accounts use the password from `DEMO_STAFF_PASSWORD` in `.env`. The example value is `EntryPass-Demo-2026`.

| Username | Access |
| --- | --- |
| `staff` | Organizer dashboard, event and account management, attendance, CSV, audit, check-in |
| `door` | Event selection and manual or camera check-in |

The first seed creates **Cebu Dev Meetup 2026** (30 spots at Ayala Center Cebu, Function Room 2, on the Cebu date it was seeded) and **Cebu Design Workshop** (full at two registrations on the following day). Use an organizer account to create a new same-day event for a later check-in demo.

## Website and database flow

| Screen | What happens |
| --- | --- |
| Events | Laravel reads published events and counts confirmed and checked-in registrations as occupied spots. |
| Register or join waitlist | Laravel locks the event row, checks capacity and duplicate emails, and saves the booking. When a queue already exists, new bookings join its end. |
| Find ticket | The attendee enters their code and email. Confirmed tickets display a QR, waitlisted bookings display their position, and cancelled bookings display their status. The owner can cancel a confirmed or waitlisted booking from this page. |
| Organizer dashboard | Organizers create, publish, edit and close events. Counts are grouped by status. Once the event starts, a no-show is a confirmed attendee who has yet to check in. |
| Attendees | Organizers search registrations, export CSV, cancel eligible bookings, promote the first waitlisted person, or undo a check-in. |
| Check in | Staff selects an event and scans a QR or enters its code. A valid confirmed ticket can check in once on the Cebu date the event starts. The counter refreshes after a successful scan. |
| Audit log | The organizer sees who acted, what changed, which record was affected, and when. An attendee cancellation is recorded without a staff ID. |

| Table | Purpose |
| --- | --- |
| `events` | Event details, Cebu timestamps, capacity, and draft/published/closed status. |
| `registrations` | Event reference, attendee details, unique ticket code, booking status, and who checked the attendee in. |
| `staff_users` | Usernames, hashed passwords, and organizer or door-staff role. |
| `audit_logs` | Actor, action, target record, and timestamp. |
| `sessions`, `cache`, `cache_locks` | Shared Laravel session and cache storage for hosted environments. |

The Level 2 migration preserves existing registrations and changes the email constraint to one **active** registration per event and email. Cancelling frees the spot and lets the same email register again. The event row is locked before capacity or registration changes. Check-in also locks the matching registration row, so a second concurrent scan sees the first check-in. Promotion and check-in audit records are saved in the same transactions as the changes.

Timestamps are stored as PostgreSQL timezone-aware timestamps. The database session and Laravel use Asia/Manila, and React formats times in that timezone regardless of the phone's settings. Codes use 128 bits of randomness, and Laravel limits lookup, cancellation, login, registration, and check-in requests. The role middleware protects organizer pages and their data endpoints.

## Where to read the code

| Path | Purpose |
| --- | --- |
| `routes/web.php` | Laravel page routes, data endpoints, and access rules. |
| `app/Http/Controllers/` | Public and staff workflows. |
| `app/Models/`, `app/Services/` | Data relationships, cancellation, auditing, and ticket emails. |
| `database/migrations/`, `database/seeders/` | Schema changes and local demo accounts and events. |
| `resources/js/main.jsx` | Browser routes. |
| `resources/js/attendee.jsx`, `staff.jsx`, `staff-admin.jsx`, `camera.jsx` | Attendee screens, staff operations, accounts/audit screens, and QR camera. |

## Email sandbox

With `MAIL_MAILER=log`, Laravel writes messages to `storage/logs/laravel.log` locally. To test real sandbox delivery, set `MAIL_MAILER=smtp` and enter the SMTP settings for a Mailtrap Email Sandbox inbox in `.env`. Register, cancel a confirmed booking to free a spot, and promote a waitlisted booking. The sandbox should receive the registration and promotion messages. Each email includes a link that fills in the ticket code. The attendee enters their registered email to open the ticket.

For the hosted demo, set `RESEND_API_KEY` and `MAIL_FROM_ADDRESS` to use Resend over HTTPS. Use your own permitted recipient when testing with the Resend onboarding sender. Mail delivery happens after the database commit. If the provider fails, the booking is still saved and the failure is logged.

## Deploy to Render over HTTPS

The repository includes `Dockerfile` and `render.yaml` for a Render Blueprint. Render builds the image remotely. Local Docker installation is unnecessary for this setup.

1. Put the repository on GitHub and connect it to a new Blueprint in Render. The Blueprint requests a free web service and free PostgreSQL database. Free Render PostgreSQL expires after 30 days.
2. Set `APP_KEY` to the output of `php artisan key:generate --show`, `APP_URL` to the assigned **HTTPS** service URL, and `INITIAL_ORGANIZER_PASSWORD` to a strong password you choose. Update `APP_URL` and redeploy if the assigned URL becomes available after the first deployment.
3. The container applies migrations on startup. Sign in as `organizer` with the initial password, remove `INITIAL_ORGANIZER_PASSWORD` from Render settings, and create the demo events. Add a door-staff account from Staff accounts.
4. Open the HTTPS URL on a phone and test the camera with a ticket displayed on a second device. Render's free web services block common SMTP ports. Use the HTTPS email option if testing hosted email.

Provider references: [Render Blueprint](https://render.com/docs/blueprint-spec), [Free Render services](https://render.com/docs/free), [Render SMTP limits](https://render.com/articles/can-i-send-email-over-smtp-from-render), [Resend email API](https://resend.com/docs/api-reference/emails/send-email).

## Acceptance checks

Source syntax checks are separate from these runtime checks. Package registry access was unavailable in the implementation environment, so no runtime result is marked as passed.

| Level | Check | Result |
| --- | --- | --- |
| 1 | Register on a phone-sized screen and see the QR; decode it and match the printed code. | Pending |
| 1 | Refresh and recover the ticket by correct code and email. Wrong combinations reveal no details. | Pending |
| 1 | Block a duplicate email and show errors for a bad email and a 10-digit mobile. | Pending |
| 1 | Seeded full event shows Full with Register disabled; direct staff page redirects when signed out. | Pending |
| 1 | Check in a valid ticket, repeat it to see the original time, and try invented and other-event codes. | Pending |
| 1 | Attendee list shows correct registered and checked-in totals. | Pending |
| 2 | Create a draft, publish it, close it, and verify public visibility at each step. | Pending |
| 2 | Reject invalid time ranges and capacity below occupied places. | Pending |
| 2 | Join the waitlist on a full event, view position, and see the waitlisted scan result. | Pending |
| 2 | Cancel a confirmed booking, see the freed spot and cancelled scan result, and re-register the same email. | Pending |
| 2 | Promote the first waitlisted attendee and successfully check them in. | Pending |
| 2 | Reject cancellation after check-in, then undo and verify the audit record and new check-in. | Pending |
| 2 | Compare dashboard and attendee totals, check the live counter, and open CSV in Excel. | Pending |
| 3 | Scan a QR from another device, see the result, then scan another after the camera resumes. Try manual fallback. | Pending |
| 3 | Submit two bookings for one remaining spot simultaneously. At most one receives a confirmed ticket. | Pending |
| 3 | Scan the same ticket simultaneously from two staff sessions. Only one receives Checked in. | Pending |
| 3 | Guess or edit a code and confirm it cannot check anyone in. | Pending |
| 3 | Receive registration and promotion emails in a sandbox inbox with working links. | Pending |
| 3 | Door staff gets 403 for organizer operations. Organizer can edit events and see all required audit actions. | Pending |
| 3 | Open the deployed HTTPS site on a phone and use its camera. | Pending |

### Demo sequence

Register from a phone and show the QR. Check it in, repeat the scan, and enter an invalid code. Open a full event, join its waitlist, then cancel a confirmed booking and promote the first waiting attendee. Recover the promoted ticket, check it in, undo the check-in, and show the audit record.
