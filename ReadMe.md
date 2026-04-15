# Schema Assumptions & Notable Design Decisions

This document outlines the architectural choices and assumptions made within the database schema, specifically regarding users, events, availability, and booking logic.

## User & Auth
* **Single User Default:** A single default user is assumed logged in on the admin side (per assignment spec), but the schema supports multiple users fully.
* **Timezone Management:** The `timezone` attribute lives on the `User` model, not on the `AvailabilitySchedule`. All schedules for a user share their timezone. If per-schedule timezones are required in the future, they can be added to `AvailabilitySchedule`.
* **Authentication:** `passwordHash` is stored directly; no OAuth/SSO support is currently modeled.

## Event Types
* **Unique Slugs:** The `slug` is unique per user (`@@unique([userId, slug])`), not globally. This allows two different users to both have an `/intro-call` endpoint, while preventing a single user from having duplicate slugs.
* **Meeting Modes:** `meetingMode` is stored as a plain `String` (e.g., "google_meet", "zoom", "in_person") rather than a foreign key to keep the implementation simple.
* **Ownership:** Each event type belongs to exactly one user. Shared or team event types are currently out of scope.

## Availability
* **Day Representation:** `dayOfWeek` is stored as an integer (0 = Sunday, 6 = Saturday) to align with JavaScript's `Date.getDay()` convention.
* **Time Storage:** `startTime` and `endTime` in rules and overrides are stored as `String` in `"HH:MM"` format. This avoids complexities with Prisma’s PostgreSQL adapter regarding native `Time` types and JS mapping.
* **Overrides:** The overrides table only stores exceptions rather than every future date. 
    * A **blocked day** has `isAvailable = false` and `null` time values.
    * A **special-hours day** has `isAvailable = true` with specific times.
* **Schedule Linking:** There is no direct link between `AvailabilitySchedule` and `EventType`. One default schedule applies to all event types by default.

## Bookings
* **Invitee Logic:** `inviteeId` is a nullable foreign key to `User`. Guest invitees (without accounts) are supported via `inviteeName` and `inviteeEmail`, which are required on every booking.
* **Participant Scale:** There is no separate `BookingParticipant` table. The schema supports exactly one host and one invitee. Multi-invitee group bookings are out of scope.
* **Conflict Prevention:** Double-booking prevention is handled in the application logic rather than via database constraints. It is recommended to use serializable transactions or advisory locks to prevent overlapping `start_at`/`end_at` insertions.
* **Fallback Logic:** `meetingMode` on a `Booking` is nullable. The application applies a fallback: `booking.meetingMode ?? eventType.meetingMode`.
* **Rescheduling:** `rescheduledFromId` is a nullable self-FK that allows tracking the chain of reschedules back to the original booking.
* **Status Enum:** Uses a Prisma enum: `SCHEDULED`, `CANCELLED`, `COMPLETED`.

## Questions & Answers
* **Booking Specificity:** Questions and answers are tied to a specific `Booking`, not an `EventType`. Question templates are seeded at booking-creation time.
* **Answer Constraints:** One answer per question is enforced via `@unique` on `BookingAnswer.questionId`. Multi-select answers are currently out of scope.

## General
* **Identifiers:** All primary keys use UUIDs (`@default(uuid())`) instead of auto-incrementing integers to better support distributed systems and prevent exposing sequential IDs in public URLs.
* **Naming Conventions:** All tables use `snake_case` in the database (`@@map`) and `camelCase` in Prisma/JavaScript to maintain consistency with industry standards for both layers.
* **Cascading Deletes:** `onDelete: Cascade` is applied to child relations (e.g., deleting a user removes their event types). However, **Bookings do not cascade-delete** to preserve records for legal or audit purposes; these should be soft-deleted or anonymized instead.