# Calendly Clone — Scheduling Platform

A full-stack scheduling/booking web application that replicates Calendly's core functionality. Users can create event types, configure their availability, and let others book time slots through a public booking page.

> **SDE Intern Fullstack Assignment — Scalar AI**

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js (Vite) |
| **Backend** | Node.js + Express 5 (ES Modules) |
| **Database** | PostgreSQL |
| **ORM** | Prisma 7 (with `@prisma/adapter-pg` driver adapter) |
| **Timezone** | `date-fns` + `date-fns-tz` (all timestamps stored in UTC) |
| **Email** | Nodemailer (Ethereal test inbox in dev) |
| **Deployment** | Vercel (frontend) · Render (backend) · Neon (PostgreSQL) |

---

## Setup Instructions

### Prerequisites

- Node.js ≥ 18
- PostgreSQL running locally (or a Neon connection string)
- npm

### Backend

```bash
cd backend
npm install
```

**1. Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and other values
```

Required `.env` variables:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/calendly_clone` |
| `PORT` | Server port | `5000` |
| `DEFAULT_USER_ID` | UUID of the seeded admin user | _(generated after seeding)_ |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `NODE_ENV` | Environment flag | `development` |

> **Note:** If your database password contains special characters (like `@`), URL-encode them. For example, `Ndjain@2023` becomes `Ndjain%402023` in the connection string.

**2. Run migrations and seed:**

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

After seeding completes, copy the admin user's UUID from the output and paste it into `.env` as `DEFAULT_USER_ID`.

**3. Start the dev server:**

```bash
npm run dev    # nodemon with auto-reload
npm start      # production
```

The API will be available at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## API Reference

Base URL: `http://localhost:5000/api`

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server status, uptime, timestamp |

### Event Types (Admin)

| Method | Path | Description |
|---|---|---|
| `GET` | `/event-types` | List all event types |
| `GET` | `/event-types/:id` | Get single event type |
| `POST` | `/event-types` | Create event type |
| `PUT` | `/event-types/:id` | Update event type |
| `DELETE` | `/event-types/:id` | Soft-delete (sets `isActive = false`) |

### Availability (Admin)

| Method | Path | Description |
|---|---|---|
| `GET` | `/availability/schedules` | List all schedules with rules and overrides |
| `GET` | `/availability/schedules/:id` | Get schedule details |
| `POST` | `/availability/schedules` | Create schedule |
| `PUT` | `/availability/schedules/:id` | Update schedule |
| `DELETE` | `/availability/schedules/:id` | Delete schedule (cascades rules + overrides) |
| `PUT` | `/availability/schedules/:id/rules` | Bulk replace weekly rules |
| `GET` | `/availability/schedules/:id/overrides` | List date overrides |
| `POST` | `/availability/schedules/:id/overrides` | Create date override |
| `DELETE` | `/availability/overrides/:id` | Delete override |

### Public Booking (No Auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/booking/:slug` | Event type info for booking page |
| `GET` | `/booking/:slug/slots?date=YYYY-MM-DD&timezone=TZ` | Available time slots |
| `POST` | `/booking/:slug/book` | Create a booking |

### Meetings (Admin)

| Method | Path | Description |
|---|---|---|
| `GET` | `/meetings?status=upcoming\|past\|cancelled` | List meetings with filter |
| `GET` | `/meetings/:id` | Meeting details with Q&A |
| `PATCH` | `/meetings/:id/cancel` | Cancel a meeting |
| `POST` | `/meetings/:id/reschedule` | Reschedule (creates new booking, cancels original) |

---

## Frontend Architecture & Assumptions

The frontend is a strictly designed Vite React SPA focused on achieving a pixel-perfect replica of the Calendly interface.

### Tech Choices & Styling Strategy
- **Hybrid CSS Architecture:** Uses standard **Tailwind CSS** layout mechanisms alongside custom imported native tokens (`copy.css`). Native classes override specific tokens ensuring identical shadow rendering, focus states, and the `Proxima Nova` font stack without extensive Tailwind configuration bloat.
- **Iconography:** Incorporates `lucide-react` dynamically to replace previously static unicode characters, bringing high-fidelity, resizable SVG visuals exactly mirroring original Calendly elements (such as angled Link icons, Plus symbols, and layout grids).
- **State & Data Fetching:** React Query (`@tanstack/react-query`) is deeply integrated into `App.jsx` handling all data fetching, invalidation strategies, and optimistic updates for interactions like scheduling event copies or toggling status states.
- **Routing:** Powered by `react-router-dom` mapping cleanly into respective dashboard modules (`/app/scheduling`, `/app/meetings`).

### Frontend Design Assumptions
- **List-View Prioritization:** The Event Types display (under "Scheduling") was specifically configured as a horizontal 1-column list rather than the standard block grid based on priority specifications.
- **Unimplemented Shell Modules:** Surfaces like 'Workflows', 'Contacts', 'Routing', and 'Analytics' are assumed out-of-scope for the primary milestone, built purely as visual placeholder buttons inside the `AdminShell` to fulfill structural accuracy.
- **No-Auth Assumption:** The frontend relies on a mock or seeded `DEFAULT_USER_ID` wrapper around the requests rather than executing real JWT or session-based authentication sequences.
- **Static Base64 Fonts:** The `Proxima Nova` typography directly loads from base64 blocks inside `copy.css` implicitly bypassing CSP restrictions during deployment phases.

---

## Backend Architecture

```
src/
├── index.js                    Express entry point
├── config/env.js               Environment variable validation
├── middleware/
│   ├── errorHandler.js         Global error → consistent JSON responses
│   ├── attachUser.js           Reads DEFAULT_USER_ID → req.userId
│   └── validate.js             Schema-based request body validation
├── routes/                     HTTP method + path definitions
├── controllers/                Request/response handling (thin layer)
├── services/
│   ├── slotEngine.js           ★ Core scheduling algorithm
│   ├── booking.service.js      Double-booking prevention with transactions
│   ├── meeting.service.js      Cancel + reschedule logic
│   ├── eventType.service.js    CRUD with slug uniqueness
│   ├── availability.service.js Schedule/rule/override management
│   └── email.service.js        Nodemailer + Ethereal
└── utils/
    ├── ApiError.js             Custom error class with HTTP status codes
    ├── dateHelpers.js          Timezone conversion, interval overlap math
    └── slugify.js              Slug generation + validation
```

The layered architecture (`Route → Controller → Service → Prisma`) keeps business logic isolated and testable. The scheduling algorithm lives in a dedicated `slotEngine.js` file.

---

## Core Algorithm: Slot Engine

The slot engine (`src/services/slotEngine.js`) computes available time slots in 9 steps:

1. **Resolve Event Type** — Find by slug, get duration and buffer times
2. **Resolve Default Schedule** — Find the host's default `AvailabilitySchedule`
3. **Determine Working Window** — Check overrides first (blocked day? special hours?), then fall back to weekly rules
4. **Convert to UTC** — Working window times in host's timezone → UTC
5. **Fetch Existing Bookings** — All `SCHEDULED` bookings that overlap the window
6. **Expand with Buffers** — Each booking's interval is expanded by `bufferBeforeMin` / `bufferAfterMin`
7. **Generate Candidate Slots** — Walk the window in increments of the event duration
8. **Filter Conflicts** — Discard any candidate that overlaps an expanded booking
9. **Convert to Invitee Timezone** — Return both UTC (for POST) and local display strings

### Double-Booking Prevention

Bookings are created inside a Prisma interactive transaction (`$transaction`). The transaction re-checks for conflicts atomically before inserting, preventing race conditions where two invitees try to book the same slot simultaneously. Conflict returns HTTP `409`.

---

## Database Schema

**8 models** across 3 domains:

```
Users ─────────────── EventTypes
  │                       │
  ├── AvailabilitySchedules    │
  │     ├── AvailabilityRules  │
  │     └── AvailabilityOverrides
  │                       │
  └── Bookings ───────────┘
        ├── BookingQuestions
        └── BookingAnswers
```

### Schema Assumptions & Design Decisions

#### User & Auth
- **Single User Default:** A single default user is assumed logged in on the admin side (per assignment spec). The admin user's UUID is read from `DEFAULT_USER_ID` in `.env`. The schema fully supports multiple users for future auth.
- **Timezone on User, not Schedule:** All schedules for a user share their `timezone` field. This simplifies the slot engine and matches Calendly's behavior.
- **No Auth Yet:** Authentication is not implemented. A hardcoded user ID is used. JWT-based auth can be added by swapping the `attachUser.js` middleware.

#### Event Types
- **Per-User Slug Uniqueness:** `slug` is unique per user via `@@unique([userId, slug])`, not globally. Two users can both have `/intro-call`.
- **Soft Delete:** `DELETE` sets `isActive = false` rather than removing the row, because existing bookings reference the event type.
- **Meeting Modes as Strings:** `meetingMode` is a plain string (`"google_meet"`, `"zoom"`, `"in_person"`, `"phone"`) for simplicity.

#### Availability
- **Day Representation:** `dayOfWeek` is an integer (0 = Sunday, 6 = Saturday), matching JavaScript's `Date.getDay()`.
- **Floating Time Strings:** `startTime`/`endTime` are stored as `"HH:MM"` strings. This avoids Prisma/Postgres `Time` type complexities and makes timezone conversion straightforward.
- **Overrides are Exceptions Only:** The overrides table only stores exceptions. A blocked day has `isAvailable = false` with null times. A special-hours day has `isAvailable = true` with specific times.
- **No Schedule ↔ EventType Link:** One default schedule applies to all event types.
- **Bulk Rule Replacement:** When saving weekly hours, the backend deletes all existing rules and inserts the new set in a single transaction (mirrors Calendly's "edit whole week, hit Save" UX).

#### Bookings
- **Guest Invitees Supported:** `inviteeId` is nullable. Guests (no account) are supported via required `inviteeName` + `inviteeEmail` fields.
- **1:1 Only:** One host, one invitee per booking. No group bookings.
- **Application-Level Conflict Prevention:** Double-booking is prevented via Prisma interactive transactions, not database constraints.
- **Meeting Mode Fallback:** `booking.meetingMode ?? eventType.meetingMode` — the booking's mode overrides the event type's default if set.
- **Reschedule Chain:** `rescheduledFromId` is a self-referencing FK that tracks the full chain (Original → Reschedule 1 → Reschedule 2 → ...).
- **Bookings Don't Cascade-Delete:** Preserves records for audit/legal purposes. Use soft-delete (status = `CANCELLED`).

#### Questions & Answers
- **Per-Booking, Not Per-EventType:** Questions are attached to individual bookings at creation time. This was a conscious trade-off for simplicity.
- **One Answer Per Question:** Enforced via `@unique` on `BookingAnswer.questionId`. No multi-select.

#### General
- **UUIDs Everywhere:** All primary keys use `@default(uuid())` — no sequential IDs exposed in URLs.
- **`snake_case` in DB, `camelCase` in JS:** All tables use `@@map("snake_case")` while Prisma models use `camelCase`.
- **Cascade Deletes on Children:** Deleting a user cascades to event types, schedules, rules, overrides. Bookings are explicitly excluded from cascading.

---

## Email Notifications (Bonus)

Emails are sent via Nodemailer on:
- **Booking confirmation** — styled HTML email to the invitee
- **Meeting cancellation** — cancellation notice to the invitee

In development, the system auto-creates an [Ethereal](https://ethereal.email) test account. All emails are caught in a fake inbox — the preview URL is logged to the console. Email failures are **non-blocking** and will never break the booking flow.

---

## Sample Data (Seed)

Running `npx prisma db seed` populates:

| Model | Seed Data |
|---|---|
| **Users** | Admin User (`admin@calendlyclone.com`) + Jane Doe (`jane@example.com`) |
| **Event Types** | "15 Min Chat" (Google Meet) + "60 Min Deep Dive" (Zoom) |
| **Availability** | Working Hours schedule (Mon–Fri, 09:00–17:00 ET) |
| **Override** | May 5, 2026 blocked (Out of Office) |
| **Booking** | Jane booked a 15-min chat on May 6, 2026 |
| **Q&A** | "What would you like to discuss?" → "Q3 product roadmap" |

The seed script is idempotent — safe to run multiple times without creating duplicates.

---

## Response Format

All API responses follow a consistent structure:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": 409,
    "message": "This time slot is no longer available.",
    "details": null
  }
}
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon |
| `npm start` | Start production server |
| `npm run seed` | Seed the database |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma migrate dev` | Create + apply migration |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |