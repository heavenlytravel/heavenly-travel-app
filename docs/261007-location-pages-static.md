# Location pages served from the CDN

Status: decided on 2026-10-07, after `261001-locations-and-pages.md` was compared with
`architecture/04-location-and-seo-architecture.md` (§8.4) in the `heavenly-travel-docs`
repository. One PR, `perf(web): serve location pages from the CDN`. Where this document
differs from `261001`, this one wins, and the PR edits that document to match (the places
are listed at the end). Not built yet.

## Why

A location's public page is rendered on every visit. The production build lists the
home page as static, and `/[location]` and `/[location]/[product]` as neither static nor
static-with-fallback: each request runs a function in `sin1`, reads the location from the
data cache, and renders the HTML again. The cache saves the Neon query, not the render and
not the function run. A visitor far from Singapore waits for the round trip every time.

`04` §8.4 asks for the location pages to be static with incremental regeneration, keyed
on `location:{slug}`, with a time-based window behind the on-demand refresh. The home page
already works that way: it is prerendered, it reads the top choices through the same
tagged cache, and its revalidate time is the one hour that cache sets. The location pages
lack only the export that tells Next to treat them the same.

| A visit to `/langkawi`      | Today                                  | After                                             |
| --------------------------- | -------------------------------------- | ------------------------------------------------- |
| Where the answer comes from | A function in `sin1`, every visit      | The CDN edge nearest the visitor, after the first |
| What is cached              | The location's data, for an hour       | The page's HTML too, for an hour                  |
| A publish or a state change | Drops the data; the next visit renders | Drops the page; the next visit renders            |
| A visit after a quiet hour  | Stale data served, refreshed behind    | Stale page served, refreshed behind               |
| The preview page            | Rendered every visit, never cached     | The same                                          |

## Decisions

### The public pages are static, rendered on demand

- `apps/web/app/(location)/[location]/page.tsx` and
  `apps/web/app/(location)/[location]/[product]/page.tsx` each export
  `generateStaticParams` returning an empty list. Nothing else changes: `dynamicParams`
  stays at its default, so a slug not in the list is rendered on first request and kept.
- The list is empty on purpose. A list of the live slugs would read the database during
  the build, and Vercel builds every pull request and every merge. After a deploy the
  first visitor to each page renders it once; the CDN keeps it from then on.
- The `[location]` layout renders with the page. Nothing on these routes reads the session
  or the request on the server, and nothing may: the header asks Clerk in the browser
  (PR 4 of `261001`), and a call to `cookies()`, `headers()` or `auth()` would silently
  make the route dynamic again. The two page files say so in a comment.
- The tags carry over. A page that reads through `unstable_cache` is cached under that
  reader's tags, so the admin's call to `/api/revalidate` with `location:<slug>` drops the
  page as it drops the data today. `top-choices` and `vehicle-classes` do the same for
  the home page and the vehicle classes on a product page.
- The one-hour fallback carries over. The page's revalidate time is the shortest of what
  it reads, which is the readers' `REFRESH_SECONDS`.
- The preview routes are untouched. They read the session, so they stay dynamic, and the
  preview bar and the access check work as before.

### What a cached answer is

- A live or paused location: its page.
- A `draft` or unknown slug: the 404 page, kept for that path. Going live refreshes
  `location:<slug>`, which drops the cached 404 with the cached "nothing here" that
  `261001` already describes.
- A product page that is not published: the temporary redirect to the landing page, kept
  under the same tag. Publishing the page refreshes it.
- A stray path such as `/wp-login.php`: the 404 page, rendered once and kept until it
  expires. The data cache is untouched, since `isLocationSlug` refuses the text before it
  is asked. This is how every site with on-demand static pages on Vercel behaves, and an
  entry is one small 404; accepted.

### What does not change

- The refresh route, the tags in `cache-tags.ts`, the admin's calls in `site.ts` and
  `REVALIDATE_SECRET`.
- `X-Robots-Tag: noindex` on every response. It is set in `next.config.ts`, which reaches
  static answers too.
- The rule from `04` §8.4 that text, prices and FAQs are in the server-rendered HTML.

## How to check it

In the build, before staging:

- `pnpm --filter web build` no longer marks `/[location]` and `/[location]/[product]` as
  dynamic, and `apps/web/.next/prerender-manifest.json` lists both under
  `dynamicRoutes`.

On staging, with `pnpm staging`:

1. The first request to a live page answers `x-vercel-cache: MISS`; the second, `HIT`.
2. Publish an edit on `staging-manage`; the next visit to the page shows it.
3. Visit the address of a draft location (404), take it live, visit again: the page.
4. Unpublish a product page: the redirect. Publish it: the page.
5. Pause the location: the notice. Resume: the card.
6. Change a vehicle class: the product page shows it on the next visit.
7. Open the preview signed out: the sign-in. Signed in: the draft, with no cache header
   saying `HIT`.
8. Time to first byte of a live page, before and after, from the developer's connection:

   ```
   curl -o /dev/null -s -w '%{time_starttransfer}\n' https://staging.heavenlytravel.my/<slug>
   ```

   Noted in the PR body.

## What this revises in `261001-locations-and-pages.md`

- "Keeping the pages fresh": the bullet "What is cached is the data, not the page" becomes
  the data and the page, rendered on demand and kept under the same tags; the preview
  line stays.
- "Module changes": a row for the two page files.
- "The customer site": a line that the public routes read nothing from the request on the
  server, and why.

Housekeeping found in the same comparison, small enough to ride along as their own
commits; strike if preferred:

- "Where this departs from `04`": a row for Delete. `04` §12.1 never 404s an address with
  rankings and gives `retired` a permanent redirect; here a location that has been live
  can be deleted on a typed slug (PR 6), and `retired` waits for the redirect table at
  cutover.
- `packages/db/prisma/schema.prisma`: the comment on `Location.state` still names
  `preview`, and the comment on `LocationPage.isOn` still describes the On switch PR 5
  removed. Comments only, no push.

## Build order

One PR into `main`, `perf(web): serve location pages from the CDN`, in commits by
concern: this document with the edits to `261001`; the two exports and their comment; the
schema comments. Lint and check-types pass; `pnpm build` is run once to read the manifest.

What the developer does by hand: nothing. No environment variable, no schema change, no
push. Put the branch on staging for the checks above.

## On record

- A warm deploy: `generateStaticParams` returning the live slugs, so a deploy carries no
  cold first visit. Needs the database at build time; not worth it for a handful of
  locations.
- Next's `"use cache"` and `cacheComponents` are a wider change to how the site caches;
  the `unstable_cache` readers stay until there is a reason to move.
