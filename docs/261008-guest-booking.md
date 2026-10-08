# Guest booking: no sign-up before the booking exists

Decided with the developer on 2026-10-08. One PR, `feat(web): book without an account`,
built in its own thread. This document wins over the customer flow in
`260923-car-with-driver.md` (step 3, the auth gate) and over "A booking can belong to
nobody" in `260930-admin-teams-and-access.md`; the PR edits both to point here.

## Why

Today a visitor searches, picks a vehicle, and is then sent to a page titled "Sign up"
before they have seen the final summary. Sign-up is an email code, so the account costs
one step, but the detour costs the context: a new page, a new purpose, and the trip
hidden behind a return URL. Most people who book a car want the car, not an account.

The business already re-verifies every booking by hand: the Reservation team calls or
WhatsApps the customer before a `received` booking becomes `confirmed`. An unverified
email at booking time therefore costs less here than on a self-serve site, and the
data model already allows a booking with no owner (staff enter phone bookings that way).

The account keeps a reason to exist: My bookings, self-service cancel, and later the
journey status (driver assigned, driver arrived). The customer is offered it after the
booking, once, quietly, and never has to take it.

## Decisions

### The flow

Search, options, confirm. No auth gate anywhere.

1. **Search** on the home page, unchanged.
2. **Options**: vehicle classes with prices, passengers, hours, flight, child seats,
   notes. Unchanged.
3. **Confirm**: the trip summary and price, and beside them name, phone and email, with
   one "Confirm booking" button. Signed-in customers see the three fields prefilled,
   the email locked to the account's. Signed-out visitors see a small line next to the
   fields, "Have an account? Sign in", which goes to sign-in and comes back to this
   page with the trip intact (the return URL the gate already used).

Contact details never enter a URL: the trip stays in the query string as before and the
contact goes in the form post only. No cookie, no extra page.

Email is required on the website: "We need your email to send your booking
confirmation." It is also required in the admin manual booking form from now on; old
rows keep `null` and `customerEmailOf` keeps its fallback.

### A guest booking

A booking created by a signed-out visitor has `userId = null` and carries its own
`contactName`, `contactPhone` and `contactEmail`, exactly like a staff-entered booking.
The activity log gets a fourth actor kind, `guest`, with no user id, so the entry reads
"Guest" where it would read the customer's name. Admin shows the booking as it shows
any ownerless booking; the activity log already tells a website guest from a staff
entry.

A web guest booking is never linked to an account at creation, even when an account
with that email exists. Staff-entered bookings keep linking immediately, because staff
spoke to the person. On the website nobody has proven anything yet.

### After the booking

- **Account holder**: redirect to `/booking/[reference]`, owner only, as today.
- **Guest**: redirect to `/booking/received/[reference]?to=a***@gmail.com`. The page
  shows the reference in large type, "Request received", "We have emailed the details
  to a***@gmail.com", the account offer line, and "Back to Heavenly Travel". It shows
  no trip details and does no lookup, so it leaks nothing and survives a refresh. The
  masked email is passed by the action; the page renders it if present.

There is no guest booking page. A guest reads their booking in the emails, which carry
the full booking on every status change already. Self-service cancel stays account
only; a guest cancels through the Reservation team as phone customers do.

### The account offer

One line, never a banner, in three places: the received page, the guest's emails, and
nowhere else. "Verify your email once to see updates and cancel online." For a guest
the email button that today says "View booking" becomes "Manage booking online" and
opens `/sign-up?email=…&redirect_url=/account/bookings/HT-XXXXXX`. The sign-up page
passes the email to Clerk as the initial value. Account holders' emails are unchanged.

Every `received` email also gets one line at the bottom: "Didn't make this booking?
Reply to this email and we will remove it."

### Claim: one query at one moment

A guest booking attaches to an account in exactly one place: when the `User` row is
first inserted. Both paths that create the row, the Clerk webhook and the first
signed-in request in `getSession`, go through `upsertUserFromClerk`. That function
changes from a blind upsert to find-then-create, and the create branch runs, in the
same transaction:

```
UPDATE "Booking" SET "userId" = <new user id>
WHERE "userId" IS NULL AND "contactEmail" = <the account's verified email>
```

Nothing runs on later sign-ins. The update is idempotent, so the webhook and the first
request racing each other is harmless: the loser's branch finds the row and updates it.
Claimed bookings do not overwrite the account's saved phone; only bookings made while
signed in do that, as today.

Nobody can claim a booking without owning the email it was made with, because Clerk
verified that email with a code. Two cases stay unlinked and go to ops: a guest who
signs up with a different email than they booked with, and an account holder who
booked while signed out despite the sign-in link. A manual claim form is a follow-up.

The email's "Manage booking online" link returns to `/account/bookings/HT-XXXXXX`.
That page calls `getAccess` first, which creates the row and runs the claim if the
webhook has not, so the booking is there when the page queries it.

### Abuse

With no sign-in and no payment, the create action is open to bots. Two guards, in the
action, no new service:

- **Honeypot**: a text field named like a real one, hidden from people by CSS and
  excluded from autofill, that bots fill. A filled honeypot gets the same generic error
  as the rate limit and creates nothing.
- **Rate limit**: counted from the `Booking` table. The creating IP is stored on the
  booking (`createdIp`, read from the request headers Vercel sets), never shown in admin,
  only read by this check. Limits to start, tuned later:

  | Key           | Window   | Limit |
  | ------------- | -------- | ----- |
  | contact email | 24 hours | 3     |
  | IP            | 1 hour   | 10    |

  Over the limit the action returns "Too many requests. Call us and we will book it
  for you." Signed-in customers are counted too; the limits are generous for a person.

Cloudflare Turnstile and a Vercel firewall rule are follow-ups if spam appears.

## Data model

```
Booking         + createdIp String?        /// Only for the rate limit; never shown.
                @@index([contactEmail, createdAt])
                @@index([createdIp, createdAt])
```

`contactEmail` stays nullable for old rows and for history. The developer pushes the
schema (`pnpm db:push`).

## Module changes

`packages/db`

- `activity-actions.ts`: `ACTOR_KINDS` gains `guest`; `GuestActor = { kind: "guest" }`;
  the log's "who" renders "Guest". Check every `switch` on actor kind.
- `booking-contact.ts`: `parseContact` requires the email, with the message above.
- `bookings.ts`: `createBooking` already accepts `userId: null`; it gains `createdIp`.
  New `countRecentBookings({ contactEmail | createdIp, since })` for the limit, and a
  pure `rateLimitDecision(counts)` beside `booking-rules.ts`, unit-tested.
- `sync.ts`: `upsertUserFromClerk` becomes find-then-create; the create branch runs
  `claimGuestBookings(tx, user)` in the same transaction. One function, exported for
  nothing else.
- A pure `maskEmail("aina@gmail.com") → "a***@gmail.com"`, unit-tested, used by the
  action.

`apps/web`

- `booking/transportation/[category]/confirm/page.tsx`: the gate goes. The page reads
  `getAccess("user")` only to prefill. The sign-in link is `signInHref(current URL)`.
- `ConfirmForm.tsx`: gains the email field (locked when signed in), the honeypot and
  the sign-in line.
- `confirm/actions.ts`: works signed out. Honeypot and limit checks first, then the
  same parse, resolve and price, then `createBooking` with the guest or customer
  actor, then redirect to the booking page or the received page.
- `booking/received/[reference]/page.tsx`: new, as described.
- `(auth)/sign-up`: reads `email` from the query and passes it to Clerk's `SignUp`
  as the initial email.
- `_lib/routes.ts`: `receivedHref`, `signUpHref(email, returnTo)`.

`apps/admin`

- `bookings/new`: email required; the form says so. No other change.

`packages/email`

- `booking-emails.ts`: for a booking with no owner the button is "Manage booking
  online" with the sign-up link and the offer line above it; the `received` email gets
  the "Didn't make this booking?" line for everyone. `EmailSettings` already has the
  site URL.

Docs edited by the PR: `260923-car-with-driver.md` step 3 and the confirm route row;
`260930-admin-teams-and-access.md` "A booking can belong to nobody" (the sentence on
guests inheriting old bookings is now built, by email at account creation);
`260922-auth-pages.md` the "return URL" note, which now serves the sign-in link and My
bookings only.

## Checks before merge

- A signed-out booking end to end on staging: confirm page, received page, the two
  emails, then "Manage booking online", code, My bookings shows the booking.
- An account holder's booking unchanged: prefill, redirect, My bookings.
- Honeypot filled and the fourth booking from one email both get the generic error.
- Admin: the manual booking form refuses a blank email; an old booking without email
  still opens.
- `pnpm lint`, `pnpm check-types`, `pnpm --filter @repo/db test`.

## Follow-ups, on record

- **Privacy notice page**, linked from the confirm form and the footer: what is
  collected, why, retention, that booking emails are transactional, how to delete an
  account. Needed before marketing emails ever exist. Deferred on 2026-10-08.
- **Manual claim form** on My bookings: reference plus the phone number used, rate
  limited, for the two unlinked cases above. Only if they show up.
- **Booking on behalf of someone else**: a contact email that differs from the
  account's, with its own fields.
- **Turnstile** on the confirm form and a **Vercel firewall** rate-limit rule, if spam
  appears.
- **Journey status** under My bookings, the reason a customer verifies.
- **Tune the limits** once real traffic shows what a busy agent or hotel desk does.
- When **payment** arrives, the card step becomes the verification and the details
  may move to their own page.
