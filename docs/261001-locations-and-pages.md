# Locations and their pages: `/[location]/[product]`

Status: decided on 2026-10-01, revised on 2026-10-02 after review, not built. Four PRs,
listed under "Build order". The
design this narrows is `architecture/04-location-and-seo-architecture.md` and
`architecture/05b-public-site.md` in the `heavenly-travel-docs` repository. Where this
document differs from those two, this one wins for the app; the differences are listed
under "Where this departs from `04`".

Today the customer site has one public page, the home page, and its four destination
cards are hard-coded. A place such as Langkawi or Kuala Kubu Bharu has no address of its
own, so there is nothing for Google to list and nothing for Marketing to write. This
plan gives every location a landing page and one page per product, all filled in from
the admin with no deploy: the text, the images, the SEO fields and whether the page is
on.

It is a narrow page editor, not a page builder. Every page has the same layout and only
the content differs.

## Decisions

### A location is a pin in one district

- A location is a place Marketing picks by search: a town, an island, an area of a city.
  It is stored with its Google place (id, label, address, coordinates).
- `districtCodeAt` places the pin in exactly one district, as it places a pickup
  (`260930-coverage.md`). Nobody types or chooses the district. A place that falls in no
  district is refused.
- A district holds any number of locations: Kuala Lumpur is one district with Bukit
  Bintang, KLCC and "Kuala Lumpur" itself. A location wider than a district, such as
  "Penang", still has one pin and so one district. Custom polygons are future work.
- Locations are flat. `/bukit-bintang` is not under `/kuala-lumpur`.
- Changing a location's place moves its pin and its district with it.

### The location's state decides what the public sees, not the district

The district switch keeps the one meaning it has: whether a pickup there is served. It
does not show or hide a page.

- `quoteTrip` checks the pickup's district only; a drop-off can be anywhere. So a
  location in a district that is off is still a destination we drive to. Its page says
  "come to Kuala Kubu Bharu by car or coach" and a customer books from an area we serve.
- A customer who asks for a pickup in a district that is off gets the message the site
  already gives: "We do not serve that pickup area yet."
- There is one page and one search card for both cases. Nothing on the page changes with
  the district switch.
- The location's page in the admin shows its district and whether pickups there are on,
  as information. The Coverage screen lists each district's locations, read-only, so
  Operation sees what a switch touches.

### States

The state is on the location. No Prisma enum: a string checked against a const array.

| State     | The public sees                               | Moves to                |
| --------- | --------------------------------------------- | ----------------------- |
| `draft`   | 404                                           | `preview`               |
| `preview` | 404. Staff see it on the preview page         | `live`, or back `draft` |
| `live`    | The pages                                     | `paused`                |
| `paused`  | The pages, with a notice in place of the card | `live`                  |

- `draft` is any location still being written. `preview` means every page that is on is
  complete and staff are checking the text and the image quality before it goes public.
- A location moves to `preview` only when its landing page and at least one product page
  are on. The same check runs again on the move to `live`.
- The move to `live` is also refused while a page that is on has unpublished changes, so
  what staff checked on the preview page is what goes public.
- These checks run on the moves and not afterwards. Marketing may switch off both product
  pages of a live location: its landing page then shows no product links and still
  carries the search card.
- A location that has been `live` never returns to `draft` or `preview`, so a public
  address never becomes a 404. `paused` is the way to stop selling a place for a while:
  a closed road, an off season.
- Marketing makes every move. Going live on the CEO's word is a working rule, not a
  check in code; restricting it to `SUPER` is future work.
- `retired` (a permanent redirect) waits for the redirect table at cutover.

### The pages of a location

- `/[location]` is the landing page. It introduces the place and links to the product
  pages that are on.
- `/[location]/[product]` is one page per product. The products are the list in code,
  `car-with-driver` and `coach-charter` today. A new product is a code change, and it
  then appears as a page on every location.
- Each page has one switch, **On**. A page can be switched on once it has a published
  copy. A product page that is off sends the visitor to the location's landing page. The
  landing page cannot be switched off once the location has left `draft`.
- The On switch says whether the page exists. It does not say whether the product can be
  booked there: coverage is one switch per district for every product, and per-product
  coverage is future work.

### The content of a page

One fixed layout, in a fixed order. A page has these fields and no others:

| Field            | Rule to be complete                                                               |
| ---------------- | --------------------------------------------------------------------------------- |
| Meta title       | Filled, at most 60 characters                                                     |
| Meta description | Filled, at most 160 characters                                                    |
| Hero headline    | Filled                                                                            |
| Hero subheadline | Filled                                                                            |
| Hero image       | Uploaded, with alt text                                                           |
| Intro            | Plain paragraphs, at least 100 words                                              |
| FAQs             | At least three, each a question and an answer                                     |
| Highlights       | Landing page only. At least three, each a name, a text and an image with alt text |

- Text is plain paragraphs. There is no rich editor and no free layout.
- A highlight may point at one of the location's saved addresses, chosen from that list
  in the editor. It is optional, because a highlight such as "Local food" has no one
  spot. A highlight with an address shows "Take me here"; see "Saved addresses" and "The
  search card".
- What the page shows beyond these fields comes from data, not from Marketing: the
  search card, the links to the location's products on the landing page, and on a
  product page that product's active vehicle classes with seats, luggage and starting
  price from `VehicleClass`.
- The image shared on social media is the hero image.
- Every page must be complete before it can be published. The limits live in one module
  and are unit-tested.

### Editing: one draft, then Publish

- Each page has a working draft and a published copy. "Save draft" overwrites the draft
  and changes nothing in public. It checks nothing but the length limits.
- "Publish" checks the draft is complete, copies it to the published copy and refreshes
  the public page. It works in any location state.
- The editor shows whether the draft differs from what is published.
- There is no version table. Every publish is written to the activity log with who,
  when, and the content before and after. To roll back, Marketing opens the entry in the
  location's history, puts the old text back and publishes again.
- Two admins on one page: a save is refused when the page changed since the form was
  opened, with "This page was changed by someone else. Reload to see it."

### The preview page

- Every location has a second address on the customer site, for staff only:
  `/preview/[location]` and `/preview/[location]/[product]`. The public pages stay at
  `/[location]`; there is no `/live/...`.
- The preview page is the public page's own components, fed the working drafts in place
  of the published copies. It shows them whatever the state and the On switches say, so
  it also serves to check an edit to a live page before publishing it. A bar on top says
  "Preview" and whether the draft differs from what is published.
- It opens only for a signed-in admin who holds `locations.manage`, asked the way every
  admin screen asks. A signed-out visitor is sent to sign in; anyone else gets a 404.
  Both apps use one Clerk application, so at worst an admin signs in once on the
  customer site.
- "Preview" on the location's page in the admin is a plain link to it. There is no
  signed link and no Draft Mode.
- The preview page is never cached.

### Saved addresses

- A location has a list of saved addresses, kept by Marketing: the places most customers
  go to there, such as "Langkawi Airport", "Kuah Jetty" or "Pantai Cenang".
- Each is a name and an exact Google place, picked by search: a spot, never an area. The
  name is filled from the place and can be changed. Marketing sets the order.
- The list is a shortcut, not a limit. A customer going anywhere else, a hotel or a
  homestay, searches for it as on the home page. So the list does not have to be
  complete, and there is no minimum: a location with none shows the normal search.
- It is the one source of places for a location. The drop-off offers it, and a highlight
  takes its "Take me here" place from it, so a place is added once.
- Saved addresses are not part of a page's draft. A change takes effect when it is saved
  and is written to the activity log.
- Removing an address that a highlight uses asks first and names the highlight. The
  highlight then shows no button.

### The search card

- The card is the home page's (`ServiceTabsSearch`). It is part of the location's shared
  frame, the `[location]` layout, so every page under a location shows it.
- No area goes into a booking. The customer's place search offers exact spots only, and
  a location is an area, so the location itself is never sent as the drop-off: the price
  would be measured to its pin and the driver would have no address.
- The drop-off starts empty. Opened with nothing typed, it offers the location's saved
  addresses under a heading such as "Popular in Langkawi"; one pick fills an exact
  place, ready to send. Typing brings the normal search for exact places.
- The saved addresses are offered on the drop-off only. The pickup is left empty and
  searches as it does everywhere.
- "Take me here" on a highlight fills the drop-off with that highlight's saved address,
  ready to send, and brings the card into view, as the home page's KLIA card does. It
  sets the trip to one-way, since an hourly trip has no drop-off.
- All the tabs stay. On a product page the card opens on that product's tab.
- While the location is `paused`, a short notice takes the card's place and "Take me
  here" is not shown.

### Slugs

- Suggested from the name by `slugify`, and editable by Marketing while the location is
  `draft` or `preview`.
- Locked the first time the location goes live. Renaming a live slug needs the redirect
  table and waits for it.
- Reserved words are refused, from one list: the site's own top-level paths (`account`,
  `booking`, `preview`, `sign-in`, `sign-up`, `api`), the product slugs, the locale codes (`en`,
  `ms`, `zh`), and the names `04` sets aside (`admin`, `search`, `manage`, `quote`,
  `packages`, `vehicles`, `transfer`, `driver`, `sitemap`, `robots`). A new top-level
  route on the customer site is added to this list in the same PR.

### Who does it

- A fifth team, `MARKETING`, with one permission, `locations.manage`: add a location,
  keep its saved addresses, write and publish its pages, flip the On switch, change its
  state and mark the top choices.
- Operation keeps the district switch. Operation sees the locations of a district on the
  Coverage screen and cannot change them.
- Any Marketing admin edits any location. There is no assignment per location; the
  history shows who did what.

### Images

- Images are uploaded from the page editor to UploadThing. The content keeps the file's
  address and key, its width and height, and its alt text.
- Alt text is required on every image. JPEG, PNG and WebP, at most 4 MB each.
- The upload route is in the admin app and checks `locations.manage`.
- A file that is replaced stays in UploadThing; clearing unused files is future work.
- For scale: the WordPress site holds about 680 images in 168 MB, checked on
  2026-10-01. UploadThing's free plan holds 2 GB.

### Search engines

- `new.heavenlytravel.my` stays out of Google until the move to `heavenlytravel.my`.
  Nothing keeps it out today, and location pages listed on the `new.` host would compete
  with the WordPress pages for the same searches. So the customer site answers every
  response, on every host, with `X-Robots-Tag: noindex`.
- The header is set in `next.config.ts`, not in `proxy.ts`: the proxy skips static files
  on purpose, and the config reaches them too.
- There is no `robots.txt`. One that disallows everything would stop a crawler from
  fetching the page, so it would never see the header.
- Everything else about indexing waits for the cutover and is built then: lifting the
  header on the indexable host, `robots.txt`, the sitemap and a switch per page for
  whether Google may list it.
- The canonical address of a page is `SITE_URL` plus its path, so it follows the host at
  cutover with no change to the pages.
- A page carries `BreadcrumbList` structured data, and `FAQPage` from its FAQs.

### The home page

- Marketing marks up to three live locations as top choices and sets their order. They
  take the place of the three hard-coded location cards. Each card shows the location's
  name, its tagline and the landing page's hero image, and opens the location's page.
- The KLIA card stays as it is, hard-coded, filling the pickup into the search card.
- A top choice that is `paused` is left off the home page. It keeps its place and comes
  back when the location is live again.
- With fewer than three top choices the row is shorter. The cap is one constant.

### Locale

The page rows are keyed by locale from the start and every row is `en`. Nothing else is
built: no `/ms/...` routes, no language switch. Malay pages are future work.

## Where this departs from `04`

| `04` and `05b`                                   | Here                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| Five states, with `retired`                      | Four. `retired` waits for the redirect table           |
| `preview` reached with a signed cookie           | A staff-only page, `/preview/[location]`               |
| Two indexing tiers, a readiness gate for tier 1  | No indexing until cutover. Every page must be complete |
| `robots.txt` disallow off the indexable host     | The noindex header alone, on every host, until cutover |
| Similarity check between locations               | Not built                                              |
| Sections that admins reorder and hide (D3)       | A fixed order of fixed fields                          |
| Locale in the routing from the first commit (D1) | Locale in the data only                                |
| Media on Vercel Blob (D10)                       | UploadThing                                            |
| Product availability per location (D14)          | The page's On switch, which is not bookability         |
| A content editor role scoped to locations (§9)   | The Marketing team, no scope                           |
| Drizzle recommended (§3)                         | Prisma, as the app already uses                        |
| Sitemap, redirect table, product hubs, packages  | Not in this plan                                       |
| Nothing ties a location to coverage              | A location knows its district, as information          |

`STATUS.md` in the docs repository records KD-18 (the main sales page is
`/[location]/[product]`, and no location pages exist). PR 4 closes it.

## Data model

Additions to `packages/db/prisma/schema.prisma`. The three tables are new, so the push
loses no data.

```
Location       id String @id @default(cuid())
               slug String @unique
               name String
               tagline String?          (the short line on a home page card)
               place Json               (the Google place, as `Place`)
               districtCode -> District (from the place's coordinates)
               state String             ("draft" | "preview" | "live" | "paused")
               wentLiveAt DateTime?     (set once; from then the slug is locked)
               topChoiceOrder Int?      (null: not on the home page)
               createdAt, updatedAt
               @@index([districtCode])
               @@index([state])

LocationPage   id String @id @default(cuid())
               locationId -> Location   (cascade)
               page String              ("landing" | "car-with-driver" | "coach-charter")
               locale String @default("en")
               isOn Boolean @default(false)
               draft Json               (the working copy)
               published Json?          (what the public sees; null until first publish)
               publishedAt DateTime?
               updatedAt
               @@unique([locationId, page, locale])

LocationAddress id String @id @default(cuid())
               locationId -> Location   (cascade)
               name String              (what the customer reads: "Kuah Jetty")
               place Json               (an exact Google place, as `Place`)
               position Int             (its order in the list)
               createdAt, updatedAt
               @@index([locationId])
```

A highlight keeps the id of its saved address in the page's content, in `draft` and
`published`. It needs no column. An id that no longer exists reads as no address.

The developer runs `pnpm db:push` once, with PR 2, and `pnpm db:push:prod` right before
that PR merges. There is no seed: locations are made in the admin.

### The activity log

A new entity type, `location`. Every entry logs against the location's id and has
`customerVisible` false.

| Action                       | Logged                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| `location.created`           | after: name, slug, district                                 |
| `location.updated`           | before and after of the changed fields, top choice included |
| `location.addresses.updated` | before and after: the saved addresses, in their order       |
| `location.state.changed`     | before and after: the state                                 |
| `location.page.published`    | the page, and its content before and after                  |
| `location.page.updated`      | the page, and the On switch before and after                |

Saving a draft is not logged. A change to the same values logs nothing, as elsewhere.

## The admin screens

Sidebar group "Marketing", item "Locations", permission `locations.manage`.

- **`/locations`**: one row per location with its name and slug, its district and state,
  its state badge, which pages are on, its top-choice place and when it last changed.
  "Add location" above the list.
- **`/locations/new`**: the place search the Coverage screen uses, with areas allowed.
  Picking a place shows the district and state it falls in and whether pickups there are
  on. Then the name, filled from the place, the slug, filled from the name, and the
  tagline.
- **`/locations/[id]`**:
  - Details: name, slug (read-only once live), place and district, tagline.
  - Saved addresses: the list in its order, each with its name and its place. "Add
    address" opens the place search for exact spots; an address can be renamed, moved
    and removed.
  - State: the current state, the move it allows and what blocks it ("Switch on the
    landing page and at least one product page", "Publish the changes on Coach
    charter").
  - Pages: a row each for Landing, Car with driver and Coach charter, with "Not
    published", "Published" or "Unpublished changes", the On switch and "Edit".
  - "Preview", a link to the preview page on the customer site, the top-choice control,
    and the location's history.
- **`/locations/[id]/pages/[page]`**: the fields above with their limits shown as they
  are typed, the image uploads, the saved address chosen on each highlight, a list of
  what is still missing, "Save draft" and "Publish".
- **`/coverage/[code]`**: each district row names its locations.

Explanations sit behind the info tooltip, as on the other screens.

## The customer site

```
app/(site)/[location]/layout.tsx           the frame and the search card
app/(site)/[location]/page.tsx             landing
app/(site)/[location]/[product]/page.tsx   one file for every product
app/(site)/preview/[location]/...          the same three files: the drafts, staff only
app/api/revalidate/route.ts                refreshes cached pages
```

- An unknown slug, a `draft` or `preview` location and an unknown product are a 404.
- The public files and the preview files are thin: both render one set of page
  components, and differ only in the reader they call and in the preview's access check.
- The pages are in the family of the home page (`260923-home-design.md`): its fonts,
  colours, header, closing call and footer. The page design is reviewed on staging in
  PR 4.
- Text, vehicle classes and FAQs are in the server-rendered HTML.

### Keeping the pages fresh

`web` and `admin` are two Vercel projects, so the admin cannot refresh the customer
site's cache by itself.

- The customer site reads published locations through a cached reader, tagged per
  location, with tags for the home page's top choices and for the vehicle classes.
- After a publish, a switch, a state change, a saved address change, a top-choice change
  or a vehicle class change, the admin's server action calls the customer site's `/api/revalidate` with
  the tags and a shared secret.
- If that call fails the change is still saved, and a one-hour refresh behind the tags
  catches the page up.
- One secret, `REVALIDATE_SECRET`, set to the same value in both apps, authorises this
  call. It is a random string we make up, not a key from a service.
- The preview page reads the drafts directly and takes no part in this.

## Module changes

| Module                                | Change                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roles.ts`                            | `ADMIN_TEAMS` gains `MARKETING` and its label                                                                                                                                                                                                                 |
| `permissions.ts`                      | `locations.manage`, for `MARKETING`                                                                                                                                                                                                                           |
| `location-input.ts`, new              | Browser-safe: the states and their moves, the page keys, the content shape, the limits, `missingFields`, the reserved slugs, the parsers. Unit-tested                                                                                                         |
| `locations.ts`, new                   | Create and update a location, keep its saved addresses, change its state, save and publish a page, flip a switch, set top choices; every write logged in its transaction. The readers for the admin and for the customer site                                 |
| `activity-actions.ts`                 | The `location` entity type, the six actions and their sentences                                                                                                                                                                                               |
| `coverage.ts`                         | The districts of a state come with their locations                                                                                                                                                                                                            |
| `apps/admin/.../locations`, new       | The four screens, their server actions and the upload route                                                                                                                                                                                                   |
| `apps/admin/app/_lib`                 | The call to the customer site's refresh route, and the address of the preview page. The "signed-in admin who holds this permission" check of `access.ts` moves to `@repo/db/server`, shared with the preview page                                             |
| `apps/admin/.../vehicle-classes`      | Calls the refresh after a change                                                                                                                                                                                                                              |
| `apps/web/app/(site)/[location]`, new | The layout and the two pages, with their metadata and structured data                                                                                                                                                                                         |
| `apps/web/app/(site)/preview`, new    | The same layout and pages over the drafts, behind the access check                                                                                                                                                                                            |
| `apps/web/app/_components/search`     | `ServiceTabsSearch` takes the saved addresses its drop-off offers before anything is typed, and opens on the tab of the product page it is on. The provider that lets a card fill it moves here from `_home` and carries a resolved place, for "Take me here" |
| `apps/web/app/_home`                  | The destination cards read the top choices; `destinations.ts` keeps only KLIA                                                                                                                                                                                 |
| `apps/web/next.config.ts`             | `X-Robots-Tag: noindex` on every response                                                                                                                                                                                                                     |
| `next.config.ts`, both apps           | The UploadThing image host                                                                                                                                                                                                                                    |
| `turbo.json`, both `.env.example`     | `UPLOADTHING_TOKEN` and `REVALIDATE_SECRET`                                                                                                                                                                                                                   |

## Build order

Four PRs into `main`. Each passes `pnpm lint` and `pnpm check-types` and leaves both
apps working.

| PR  | Title                                       | Holds                                                                                                                                                                                                                                             |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docs: add the locations plan`              | This document                                                                                                                                                                                                                                     |
| 2   | `feat: locations in the admin`              | The schema, the Marketing team, the states and slugs of `location-input.ts`, creating and updating a location, their log actions, `/locations`, `/locations/new`, the details and saved addresses of `/locations/[id]`, the locations on Coverage |
| 3   | `feat(admin): location page editor`         | The content shape and its limits, save and publish, the On switch, uploads, the saved address on a highlight, the state moves, the top choices, the rest of the log actions and the history                                                       |
| 4   | `feat: location pages on the customer site` | The public pages, the preview page, the refresh route and the admin's calls to it, the noindex header, structured data, the search card with the saved addresses and "Take me here", the home page cards                                          |

What the developer does by hand:

- PR 2: `pnpm db:push`, then `pnpm db:push:prod` before the merge. Give a Marketing
  admin the team on the Admins page.
- PR 3: create the UploadThing app and set `UPLOADTHING_TOKEN` for the admin app, in
  `apps/admin/.env.local` and on Vercel. The token alone is enough; the separate secret
  key is for the older SDK.
- PR 4: set `REVALIDATE_SECRET` to the same value in both apps, locally and on Vercel.
  The admin app already has `SITE_URL`.

After PR 2 Marketing can add locations and their saved addresses. After PR 3 it can write and publish their pages,
and nothing is public yet. PR 4 makes them reachable.

## Future work, on record

- Malay pages under `/ms/...`: the landing and product pages and the fixed text on them.
  The booking flow and the emails stay English until their own plan.
- A return trip as one booking: Kuala Lumpur to Kuala Kubu Bharu and back, the driver
  waits. It is served whatever the destination's district switch says, because the only
  pickup that counts is the first.
- Go-live restricted to `SUPER`.
- At cutover to `heavenlytravel.my`:
  - The indexable host, as one setting keyed on the hostname and never on the
    environment (`04` §2.4), and the noindex header lifted on that host only.
  - `robots.txt` and the sitemap.
  - A switch per page for whether Google may list it. The decision is the CEO's;
    Marketing flips it.
  - The redirect table, `retired`, and renaming a live slug.
- Product hubs, `/car-with-driver` and `/coach-charter`, linking every live location.
- Packages under a product page.
- Parent and child locations, for breadcrumbs and "nearby" links.
- The similarity check between locations, when there are enough to compare.
- Custom polygons for a location wider or narrower than its district.
- Per-product coverage, when a district has cars but no coach.
- A version list with a restore button, if rolling back by hand proves too slow.
- Clearing replaced images from UploadThing.
- Destination cards on the home page beyond three.
