<p align="center">
  <img src="assets/images/gallery/ck_logo.png" alt="CK Celestial Garden logo" width="180">
</p>

# CK Celestial Garden INC Website

A responsive, bilingual website for **CK - Celestial Garden INC**, a residential-care and assisted-living home in Anaheim, California.

The website allows visitors to learn about the home, view services, switch between English and Vietnamese, and submit a tour request. After a tour request is submitted, the website shows an on-screen confirmation and uses the **Resend Email API** to notify the staff by email.

## Main Tour-Request Workflow

The tour-scheduling feature follows this process:

1. The visitor selects a tour date and time.
2. The visitor enters their name, phone number, and optional email address.
3. The browser sends the information to `POST /api/bookings`.
4. The Node.js server validates the request and checks the selected time.
5. The server sends an email notification through Resend to:

```text
ck.celestialarden@gmail.com
```

7. The visitor sees a success notification on the website.
8. A staff member reviews the email and manually contacts the visitor to confirm the tour.

> The visitor does **not** automatically receive a confirmation email. The website displays a successful submission notification, and the staff receives the email notification. The tour remains pending until the staff contacts the visitor.

## Features

### Public website

- Responsive desktop, tablet, and mobile layout.
- English and Vietnamese language support.
- First-visit language-selection modal.
- Saved language preference using `localStorage`.
- Home, About, Services, Schedule Tour, and Contact sections.
- Business address, phone number, map link, gallery, and footer.

### Tour scheduling

- Requires a date at least seven days in advance.
- Uses the `America/Los_Angeles` time zone.
- Displays tour times in 30-minute intervals.
- Creates 60-minute tour appointments.
- Allows a maximum of two overlapping family tours.
- Requires the visitor's name and phone number.
- Accepts an optional visitor email address.
- Prevents duplicate submissions while the request is being sent.
- Rejects a selected time when its capacity is full.
- Displays an on-page success notification after submission.
- Saves booking information to `data/bookings.json`.
- Sends a staff email notification using Resend.

### Staff email notification

The email sent to the staff includes:

- Tour date.
- Tour start and end time.
- Tour duration.
- Time-zone information.
- Visitor name.
- Visitor phone number.
- Visitor WhatsApp link.
- Visitor email address, when provided.
- A reminder for the staff to contact the visitor.

When the visitor provides an email address, the server also sets that address as the email's reply-to address.

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js 18 or newer |
| Server | Node.js built-in `http` module |
| Localization | JavaScript translation files and `localStorage` |
| Email notifications | Resend REST API |
| Source control | Git and GitHub |

The server sends email through the Resend REST API directly, so the project currently has no third-party npm dependencies.


## Requirements

Install the following before running the website:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) version 18 or newer
- A [Resend](https://resend.com/) account
- A Resend API key for real email delivery


### 1. Clone the repository

```bash
git clone https://github.com/MoonnGuy/CK-Celestial-Garden-Website.git
cd CK-Celestial-Garden-Website
```

### 2. Create the `.env` file

Create a file named `.env` in the project root, beside `server.js`:

```env
PORT=3000
SITE_NAME=CK Celestial Garden
STAFF_EMAIL=ck.celestialarden@gmail.com
ADMIN_TOKEN=replace-with-a-long-random-secret
RESEND_API_KEY=PASTE_YOUR_RESEND_API_KEY_HERE
```

The value shown for `RESEND_API_KEY` is only a placeholder. Replace it with the private key created in your Resend account.

Do not add spaces around the `=` signs, and do not put the values inside JavaScript files.

The server loads `.env` directly, so the `dotenv` npm package is not required.

### 3. Start the server

```bash
npm start
```

Open the website at:

```text
http://localhost:3000
```

Do not open `index.html` or `schedule.html` directly with a `file://` address. The booking form requires the Node.js server and the `/api/bookings` endpoint.

## Resend API-Key Setup

### 1. Create a Resend account

Create or sign in to your Resend account.

### 2. Create an API key

In the Resend dashboard:

1. Open **API Keys**.
2. Select **Create API Key**.
3. Give the key a descriptive name, such as `CK Celestial Garden Website`.
4. Use a sending-only permission when possible.
5. Copy the key immediately.

Resend API keys normally begin with:

```text
re_
```

Official documentation:

- [Create a Resend API key](https://resend.com/docs/create-an-api-key)
- [Handle Resend API keys safely](https://resend.com/docs/knowledge-base/how-to-handle-api-keys)

### 3. Add the API key to `.env`

```env
RESEND_API_KEY=PASTE_YOUR_RESEND_API_KEY_HERE
```

Restart the Node.js server after changing `.env`:

```bash
npm start
```

### Important API-key security

Never place the real API key in:

- `README.md`
- `index.html`
- `schedule.html`
- `schedule.js`
- `script.js`
- Any browser-side JavaScript file
- A GitHub commit
- A screenshot or public message

The API key belongs only in the server environment. The repository's `.gitignore` already includes `.env`.

If a real API key is accidentally pushed to GitHub, delete or rotate it immediately in the Resend dashboard and create a new key.

## Resend Sender Configuration

The current server uses this development sender in `server.js`:

```js
from: 'Celestial Garden Booking <onboarding@resend.dev>'
```

This sender is useful for initial testing. Resend may restrict the development sender to test messages associated with the Resend account.

For production email delivery, add and verify a domain in Resend, then change the sender to an address on that verified domain. For example:

```js
from: 'CK Celestial Garden <bookings@your-verified-domain.com>'
```

The domain in the sender address must match a domain verified in the Resend account.

Official documentation:

- [Add and verify a sending domain](https://resend.com/docs/add-a-domain)
- [Send email with the Resend API](https://resend.com/docs/api-reference/emails/send-email)

## Environment Variables

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | Port used by the Node.js server |
| `SITE_NAME` | Recommended | `CK Celestial Garden` | Name used in the staff email subject |
| `STAFF_EMAIL` | Yes for staff notification | `ck.celestialarden@gmail.com` | Inbox that receives tour requests |
| `ADMIN_TOKEN` | Yes for admin access | A long random value | Protects admin API endpoints |
| `RESEND_API_KEY` | Yes for real email delivery | `re_...` | Authenticates the server with Resend |

Never use the default `ADMIN_TOKEN` in production.

## How the Email Notification Works

The email notification is sent by `server.js`, not by browser JavaScript.

```text
Visitor submits form
        |
        v
schedule.js sends POST /api/bookings
        |
        v
server.js validates the request
        |
        v
Booking is saved to data/bookings.json
        |
        v
server.js calls the Resend Email API
        |
        v
Staff receives the tour-request email
        |
        v
Staff contacts the visitor manually
```

The server authenticates with Resend using this environment variable:

```js
process.env.RESEND_API_KEY
```

The request is sent to the Resend email endpoint with an authorization header similar to:

```text
Authorization: Bearer RESEND_API_KEY
```

The API key never needs to be sent to the browser.

## Important Booking Behavior

A booking is saved before the staff email is sent.

This means:

- If the booking is valid, it is added to `data/bookings.json`.
- The server then attempts to send the staff notification.
- If Resend succeeds, the API reports that the notification was sent.
- If Resend fails, the booking remains saved.
- The server prints the email error in the terminal.

When `RESEND_API_KEY` is missing, the server does not send a real email. Instead, it prints a simulated email in the terminal and returns a notification status explaining that the key is not configured.

## Scheduling Rules

The backend currently applies these rules:

| Setting | Current value |
| --- | --- |
| Time zone | `America/Los_Angeles` |
| Minimum advance notice | 7 days |
| Tour duration | 60 minutes |
| Time-slot interval | 30 minutes |
| Backend first start time | 9:00 AM |
| Last start time | 4:00 PM |
| Maximum overlapping families | 2 |
| Initial booking status | `pending_staff_confirmation` |

The public scheduling form currently displays times from 9:30 AM through 4:00 PM. The backend also defines 9:00 AM, so the frontend and backend start times should be aligned if 9:00 AM should be selectable.

## Testing the Email Notification

### Test without a Resend API key

1. Remove or comment out `RESEND_API_KEY` in `.env`.
2. Start the server.
3. Submit a valid tour request.
4. Confirm that the visitor sees the success notification.
5. Confirm that the booking appears in `data/bookings.json`.
6. Check the terminal for the simulated staff email.

### Test with a Resend API key

1. Add a valid `RESEND_API_KEY` to `.env`.
2. Confirm that `STAFF_EMAIL` is correct.
3. Start or restart the server.
4. Submit a valid tour request.
5. Confirm that the website displays the success notification.
6. Confirm that the booking appears in `data/bookings.json`.
7. Check `ck.celestialarden@gmail.com` for the notification.
8. Check the spam or junk folder if the message is not in the inbox.
9. Review the Resend dashboard logs for the delivery result.

### Expected email subject

```text
New Tour Request — CK Celestial Garden
```

### Expected visitor status

```text
pending_staff_confirmation
```

The staff should call or email the visitor to provide the final confirmation.

## Troubleshooting

| Problem | Likely cause | Resolution |
| --- | --- | --- |
| No email is sent | `RESEND_API_KEY` is missing | Add the key to `.env` and restart the server |
| Terminal says the key is not set | `.env` is missing or incorrectly named | Confirm the file is exactly `.env` and is beside `server.js` |
| Resend returns an authentication error | Invalid, deleted, or incomplete API key | Create a new key and update `.env` |
| Resend returns a sender or domain error | The `from` address is not permitted | Verify a domain and use an address on that domain |
| Booking is saved but no email arrives | Email delivery failed after storage | Check the server terminal and Resend logs |
| Browser says it cannot reach the server | Node.js server is not running | Run `npm start` and use `http://localhost:3000` |
| Staff email is incorrect | Wrong `STAFF_EMAIL` value | Update `.env` and restart the server |
| Message is not in the inbox | Spam filtering or delivery delay | Check spam and the Resend email logs |
| A time is rejected as full | Overlapping capacity reached | Select another time |

## API Reference

### Get public scheduling configuration

```http
GET /api/config
```

### Get availability for a date

```http
GET /api/availability?date=YYYY-MM-DD
```

### Create a tour request

```http
POST /api/bookings
Content-Type: application/json
```

Example request:

```json
{
  "date": "2026-08-20",
  "time": "10:30",
  "name": "Visitor Name",
  "phone": "714-555-0100",
  "email": "visitor@example.com"
}
```

The `email` field is optional. The date, time, name, and phone number are required.

A successful request returns:

```http
201 Created
```

A full or conflicting time returns:

```http
409 Conflict
```

### List bookings as an administrator

```http
GET /api/admin/bookings?token=YOUR_ADMIN_TOKEN
```

The admin token can also be passed through the `x-admin-token` request header.

### Export bookings as CSV

```http
GET /api/admin/export.csv?token=YOUR_ADMIN_TOKEN
```


## Deployment Notes

This project cannot run its scheduling API and Resend notification from a static-only host by itself. The production host must support a continuously running Node.js server.

Production configuration should include:

- Node.js 18 or newer.
- `npm start` as the start command.
- `RESEND_API_KEY` stored in the host's environment-variable settings.
- `STAFF_EMAIL=ck.celestialarden@gmail.com`.
- `SITE_NAME=CK Celestial Garden`.
- A strong `ADMIN_TOKEN`.
- HTTPS.
- A verified Resend sending domain.
- Persistent storage for `data/bookings.json`.
- Backups and monitoring.

File-based JSON storage is most appropriate for development or a very small single-server deployment. A managed database is recommended before using multiple server instances.

## Current Notification Model

```text
Customer -> Website form -> Server -> Resend -> Staff email
```

The website is intentionally configured as a one-way request system:

- The customer submits their information.
- The customer receives an on-screen confirmation.
- The staff receives the details by email.
- The staff contacts the customer directly.

This keeps the workflow simple and avoids the cost and complexity of SMS confirmation.


## License

No open-source license file is currently included. Unless a license is added by the repository owner, the source code should be treated as all rights reserved.
