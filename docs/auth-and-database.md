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
  in that function:

  | Area      | Who gets in                            |
  | --------- | -------------------------------------- |
  | `user`    | any signed-in user                     |
  | `driver`  | active driver profile, or any admin    |
  | `partner` | active partner profile, or any admin   |
  | `admin`   | admin profile (level stored, not used) |

- **Users are synced by webhook** (`apps/web/app/api/webhooks/clerk/route.ts`) on
  `user.created`, `user.updated` and `user.deleted`. If a signed-in user has no row yet
  (webhook not registered or not delivered), `getSession` creates it on first request.

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
```

Levels: `SUPER`, `REGULAR`, `OPS` (`packages/db/src/roles.ts`). All levels currently have
the same access; the level is stored for when that changes.
