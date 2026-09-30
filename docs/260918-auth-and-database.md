# Auth (Clerk) and database (Neon + Prisma)

## Shape

- **One Clerk application** serves both apps. Every person signs up once on the customer
  site and is a customer immediately.
- **Identity lives in Clerk, access lives in Postgres.** `packages/db` (`@repo/db`) owns
  the Prisma schema. A `User` row mirrors each Clerk user; access to an area is granted
  by the presence of a profile row (`AdminProfile`, `DriverProfile`, `PartnerProfile`),
  never by a role column. One person may hold several profiles.
- **Checks happen in pages, not in `proxy.ts` or layouts.** `clerkMiddleware()` in each
  app's `proxy.ts` only attaches the session. Pages call `getAccess(area)` from
  `@repo/db/server` and render each status themselves. The access matrix lives only
  in that function. Inside the admin area, what each team reaches lives only in
  `permissions.ts` (see "Levels, teams and the wall" below). The one exception is the reverse check: each app's `(auth)` layout
  sends a signed-in visitor away from `/sign-in` and `/sign-up` on the server, so the
  form never flashes before Clerk's own client-side redirect (see `260922-auth-pages.md`).

  | Area      | Who gets in                          |
  | --------- | ------------------------------------ |
  | `user`    | any signed-in user                   |
  | `driver`  | active driver profile, or any admin  |
  | `partner` | active partner profile, or any admin |
  | `admin`   | admin profile                        |

- **Users are synced by webhook** (`apps/web/app/api/webhooks/clerk/route.ts`) on
  `user.created`, `user.updated` and `user.deleted`. If a signed-in user has no row yet
  (webhook not registered or not delivered), `getSession` creates it on first request.
- **Bookings live in the same package.** Zones, vehicle classes, pricing, business
  rules and the booking core are modules in `packages/db/src`, shared by both apps.
  The pure ones (`booking-rules.ts`, `pricing.ts`, `references.ts`, `booking-status.ts`)
  are also exported from `@repo/db` for the browser and unit-tested with
  `pnpm --filter @repo/db test`. See `260923-car-with-driver.md`. A booking need not
  belong to a `User`: staff enter bookings for guests, and the booking carries its own
  contact email (`260930-admin-teams-and-access.md`, "A booking can belong to nobody").

## Environments

| Environment       | Clerk instance | Neon branch   | Where the values live                          |
| ----------------- | -------------- | ------------- | ---------------------------------------------- |
| Local             | Development    | `development` | `apps/web/.env.local`, `apps/admin/.env.local` |
| Preview / staging | Development    | `development` | Vercel env vars, **Preview** scope             |
| Production        | Production     | `production`  | Vercel env vars, **Production** scope          |

Both apps need the same variable names; see each app's `.env.example`. Never put
`pk_live`/`sk_live` keys or the production database URL in a local file or Preview scope.

## Schema changes (no migrations)

`packages/db/.env` is read by the Prisma CLI only and holds two URLs: `DATABASE_URL`
(Neon `development` branch) and `DATABASE_URL_PRODUCTION` (Neon `production` branch).
The running apps read their own `.env.local`, so nothing here affects a dev server.

```sh
pnpm db:push         # development branch
pnpm db:push:prod    # production branch, asks you to type "production" first
pnpm db:studio       # browse development data
```

Every `*:prod` script in `packages/db` goes through `scripts/with-production-db.ts`,
which swaps in the production URL for that one command after the typed confirmation.
Push to development first, test, then push to production before merging the PR.

`prisma generate` runs on install and on build.

Reference data (vehicle classes, zones and their districts) comes from
`packages/db/prisma/seed.ts`, which is idempotent:

```sh
pnpm --filter @repo/db db:seed         # development branch
pnpm --filter @repo/db db:seed:prod    # production branch, typed confirmation
```

## Webhook registration

One endpoint per Clerk instance, both pointing at the web app:

| Clerk instance | Endpoint URL                                           |
| -------------- | ------------------------------------------------------ |
| Development    | `https://staging.heavenlytravel.my/api/webhooks/clerk` |
| Production     | `https://new.heavenlytravel.my/api/webhooks/clerk`     |

Subscribe to `user.created`, `user.updated`, `user.deleted`. Put the signing secret in
`CLERK_WEBHOOK_SIGNING_SECRET` for the matching Vercel scope. Because local and staging
share the Development instance and the `development` branch, sign-ups on your machine
are written by the staging endpoint. No tunnel is needed locally.

## Making the first admin

Sign in once so the `User` row exists, then:

```sh
pnpm --filter @repo/db db:promote-admin you@heavenlytravel.my SUPER
# production: same arguments, asks for confirmation
pnpm --filter @repo/db db:promote-admin:prod you@heavenlytravel.my SUPER
# a REGULAR admin needs at least one team, named after the level
pnpm --filter @repo/db db:promote-admin name@heavenlytravel.my REGULAR SALES RESERVATION
```

## Levels, teams and the wall

Decided in `260930-admin-teams-and-access.md`. The values are in
`packages/db/src/roles.ts`.

- The level is `SUPER` or `REGULAR` and says who manages staff. A level the code does
  not know reads as `REGULAR`.
- The teams are `OPERATION`, `RESERVATION`, `SALES` and `FINANCE` and say which work is
  theirs. An admin can hold several. `SUPER` needs none; a `REGULAR` admin needs at
  least one.
- The wall is the map from teams to screens and actions. It lives only in
  `packages/db/src/permissions.ts`, as data with one pure function, `may`.
- The wall switch is the `wallActive` column of the one `AppSetting` row
  (`packages/db/src/settings.ts`). Off, every admin reaches every team screen and
  action. The Admins page and the switch are `SUPER` only in both states.

## Admin access is invite-only

The admin site (https://manage.heavenlytravel.my) has no sign-up. A person signs up as a
customer on the web app, then a `SUPER` admin promotes them on the **Admins** page, which
also sets levels and teams, revokes access and holds the wall switch. The page and the
`db:promote-admin` script share `setAdmin` / `revokeAdmin` in
`packages/db/src/admins.ts`, which always keep at least one `SUPER` admin.

Every admin page starts with `requireAdmin(permission)`
(`apps/admin/app/_lib/access.ts`), naming the screen it guards: signed-out visitors go
to `/sign-in`, signed-in users without an admin profile go to `/no-access`, and an
admin whose teams do not reach the screen goes to `/restricted`. Server actions check
again with `getAdmin(permission)`, because they can be called by direct POST.

The sidebar shows only the sections the admin may open, and a button the admin may not
use is not rendered. Both read `getPermissions()`; neither is the check itself.

## The activity log

Decided in `260930-admin-teams-and-access.md`. Every change to a booking, an admin or a
setting writes one `ActivityLog` row in the same transaction, so a change that is not
logged does not happen. Rows are never edited or deleted.

- Every mutation in `packages/db` takes the actor first: `{ kind: "admin", userId }`,
  `{ kind: "customer", userId }` or `SYSTEM_ACTOR` for a script. Server actions build
  it with `actorOf(admin)` from `apps/admin/app/_lib/access.ts`.
- The vocabulary (actor kinds, actions, record types, `customerVisible`) is in
  `packages/db/src/activity-actions.ts`, browser-safe. `logActivity` and the readers
  are in `packages/db/src/activity.ts`. An item action logs against its booking.
- The log holds user ids only, no relation, so a renamed or deleted user never rewrites
  it. The readers name actors and records when they load a page.
- One booking's history shows on its admin page to anyone who can open it. The full
  log is `/activity`, `SUPER` only. Entries carry `customerVisible` for a future
  customer page; nothing customer-facing reads the log yet.
