# EntryPass

EntryPass is a free event registration and QR check-in app for Cebu events. It uses Laravel 12, React, Bootstrap 5, Vite, and PostgreSQL. It implements the Level 1 and Level 2 flows and the Level 3 camera, concurrency, ticket security, email, and staff-role features. The HTTPS deployment configuration is included. The acceptance results below cover verified behavior and the remaining physical-device and Excel checks.

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

The first seed creates **Cebu Dev Meetup 2026** (30 spots at Ayala Center Cebu, Function Room 2, on the Cebu date it was seeded) and **Cebu Design Workshop** (full at 30 registrations on the following day). Use an organizer account to create a new same-day event for a later check-in demo.

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

Tested on November 26, 2026 (Asia/Manila). The tables cover all 29 submission checks. **Fail** means an observed mismatch with the stated requirement. **Unverified** means part of the required test could not be observed. Quoted messages are assessed literally.

### Level 1

| Requirement | Result | Observation |
| --- | --- | --- |
| Register for Cebu Dev Meetup 2026 on a phone-sized screen and see a QR ticket | Pass | In Edge at 390 × 844, selecting an available chair and submitting the form opened a ticket with a loaded QR image and ticket code. |
| Scan the QR with a phone QR app and match the printed code | Unverified | The scanner decoded the rendered QR and checked in the correct attendee using a simulated video stream. A physical phone QR app was unavailable. |
| Refresh and recover the ticket with its code and email | Pass | After reload, Find ticket returned the same displayed code for the registration email. |
| Wrong code or email shows “Ticket not found” without details | Pass | Both lookup variations returned HTTP 404 with the expected message and no attendee name. |
| Block a duplicate email for one event | Pass | A second registration for the same event and email returned HTTP 422. |
| Show errors for both a bad email and a 10-digit mobile on submission | Pass | At 320 px, submitting both invalid values displayed both field messages in the reservation dialog. |
| Seeded full event shows “Full” and disables Register | Pass | The seeded workshop displayed “Full” and its Register button was disabled. |
| Redirect signed-out staff to sign-in | Pass | Opening the protected staff page redirected to the staff sign-in route. |
| Check in a valid ticket and show green “Checked in” with the name | Pass | The scanner displayed the success alert with the registered name. |
| Repeat check-in shows yellow “Already checked in” and first time | Pass | The next scan displayed the warning alert and a PHT timestamp. The backend returned the original stored timestamp. |
| Reject made-up and other-event tickets as “Invalid ticket” | Pass | Both inputs produced the invalid status, which the staff screen renders as “Invalid ticket”. |
| Attendee list totals match registrations and check-ins | Pass | One registered attendee and one completed check-in produced list counts of 1 and 1. |

### Level 2

| Requirement | Result | Observation |
| --- | --- | --- |
| Hide Draft, then show the event after publishing | Pass | The public list omitted the draft, direct access returned 404, and publishing added the event to the list. |
| Reject an end time before the start | Pass | Saving an event ending the previous day returned HTTP 422. |
| Block capacity below registration count with a message | Pass | Reducing a full 30-seat event to 29 returned HTTP 422. The application rejects changing that booked room layout. |
| Join a full event’s waitlist and see the position | Pass | The first waitlisted ticket returned position 1, which the ticket screen displays. |
| Scan a waitlisted ticket and show “On waitlist — not confirmed” | Pass | Submitting a waitlisted code on the staff check-in screen displayed “On waitlist — not confirmed”. |
| Cancel a confirmed registration, free one spot, and show “Cancelled” on scan | Pass | Occupancy fell from 1 to 0 on a one-place event. The cancelled code returned the cancelled status. |
| Promote the first waitlisted attendee and admit them | Pass | The first queued ticket checked in after promotion. |
| Block cancellation after check-in | Pass | The cancellation endpoint returned HTTP 422 for a checked-in registration. |
| Undo a check-in, record it, and allow another check-in | Pass | Undo succeeded, created a check-in undo audit entry, and the same code checked in again. |
| Dashboard counts match the list and CSV opens correctly in Excel | Unverified | Dashboard and list totals matched. The CSV parsed into seven named columns and preserved the fixture’s mobile number as text when read with a CSV parser. Windows denied Excel automation and the desktop launch failed, so Excel cell formatting remains unverified. |

### Level 3

| Requirement | Result | Observation |
| --- | --- | --- |
| Camera scans another phone’s screen and becomes ready for the next scan | Unverified | The actual camera component decoded the rendered ticket from a simulated video stream, showed the correct name, resumed, and decoded a second time. Physical phone-to-camera scanning remains unverified. |
| Two simultaneous registrations compete for the last spot | Pass | Two independent Laravel request workers were observed waiting for the same PostgreSQL event lock. Releasing it yielded one HTTP 201 confirmed booking and one HTTP 422 waitlist response. This exercised the server race without physical browsers. |
| Two simultaneous check-ins admit the same ticket only once | Pass | Two independent authenticated workers overlapped on the PostgreSQL lock. One returned checked_in, the other already_checked_in. |
| Sequential or edited codes are invalid | Pass | A sequential guess and a one-character edit were rejected. This is a sampled rejection test. |
| Registration and promotion emails reach a sandbox inbox with ticket links | Pass | A local SMTP capture inbox received registration and promotion messages for the expected recipients, each containing a ticket lookup link. |
| Door staff cannot create or edit events, Organizer can | Pass | Door staff received 403 for both operations. An organizer created the draft and edited it to publish. |
| Deployed HTTPS site works on a phone, including the camera | Unverified | The configured application URL was localhost. No deployed HTTPS URL or physical handset was available for this test. |

To repeat the isolated HTTP checks, run **php tests/acceptance.php** from the repository root with Composer dependencies and PDO SQLite installed. An optional output path saves the generated CSV. The script uses an in-memory database. The browser, PostgreSQL contention, SMTP inbox, and Excel checks above were separate runs.

Browser layout checks covered the public event list, room map, ticket lookup, staff dashboard, attendee list, check-in, event creation, staff accounts, and audit page. None had horizontal page overflow at 320, 390, 600, 768, 1024, 1440, or 1920 CSS pixels.

### Demo sequence

Register from a phone and show the QR. Check it in, repeat the scan, and enter an invalid code. Open a full event, join its waitlist, then cancel a confirmed booking and promote the first waiting attendee. Recover the promoted ticket, check it in, undo the check-in, and show the audit record.
