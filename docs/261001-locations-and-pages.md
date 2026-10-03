# Locations and their pages: `/[location]/[product]`

Status: decided on 2026-10-01, revised on 2026-10-02 after review, and again the same day
while PR 2 was built: a location's districts are ticked by Marketing, not detected from a
Google place, and the Coverage screen does not list locations. All four PRs are built;
what PR 3 and PR 4 settled while they were built is marked "PR 3" and "PR 4" below. A
fifth PR then made the flow simpler, as decided in `261003-location-flow.md`: three
states, pages that are published or not with no switch, and a Home page screen. What it
changed is marked "PR 5". A sixth added Delete for a location, marked "PR 6". The PRs are listed under "Build order". The
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

### A location names its districts

- A location is a town, an island or an area of a city. It is a name, a slug and the
  districts it lies in. It has no Google place and no pin of its own.
- Marketing ticks the districts: first the states the location is in, then the districts
  of those states. At least one. "Penang" ticks Barat Daya and Timur Laut; "Kuala Kubu
  Bharu" ticks Hulu Selangor.
- A first build detected one district from the pin of a Google place. It was set aside
  while PR 2 was built: a wide place has one arbitrary pin, and "Penang" landed in one
  district of several.
- The districts are information for the team. They are kept as a list of codes on the
  location, with no relation to the `District` table: nothing ties a location to
  coverage.
- A district holds any number of locations: Kuala Lumpur is one district with Bukit
  Bintang, KLCC and "Kuala Lumpur" itself.
- Locations are flat. `/bukit-bintang` is not under `/kuala-lumpur`.

### The location's state decides what the public sees, not the district

The district switch keeps the one meaning it has: whether a pickup there is served. It
does not show or hide a page.

- `quoteTrip` checks the pickup's district only, from the pickup's own coordinates; a
  drop-off can be anywhere. So a location whose districts are off is still a destination
  we drive to. Its page says
  "come to Kuala Kubu Bharu by car or coach" and a customer books from an area we serve.
- A customer who asks for a pickup in a district that is off gets the message the site
  already gives: "We do not serve that pickup area yet."
- There is one page and one search card for both cases. Nothing on the page changes with
  the district switch.
- The location's page in the admin lists its districts, each with a dot that says
  whether pickups are on there, as information: a green dot for Timur Laut, a grey ring
  for Barat Daya. The Coverage screen does not list locations, because a switch does not
  touch them.

### States

The state is on the location. No Prisma enum: a string checked against a const array.

| State    | The public sees                               | Moves to |
| -------- | --------------------------------------------- | -------- |
| `draft`  | 404. Staff see the drafts on the preview page | `live`   |
| `live`   | The pages                                     | `paused` |
| `paused` | The pages, with a notice in place of the card | `live`   |

- There are three states (PR 5). A fourth, `preview`, stood between `draft` and `live`
  until then; it went because the preview page shows the drafts in every state, so the
  move to it meant nothing to Marketing. A stored state the code does not know reads as
  `draft`.
- `draft` is any location still being written. Each state has one move.
- A location goes live only when its landing page is published. No product page is
  needed (PR 5; one was until then): the landing page alone carries the search card, and
  with no product page published it shows no product links.
- Going live is also refused while a published page has edits waiting in its draft, so
  what staff checked on the preview page is what goes public.
- While a check fails, "Go live" is disabled and the location's screen says what to do
  first: "Publish the landing page", "Publish the changes on the Coach charter page"
  (PR 5).
- These checks run on the move and not afterwards. Marketing may unpublish both product
  pages of a live location: its landing page then shows no product links and still
  carries the search card.
- Resuming a paused location checks nothing (PR 3): its pages never stopped being public,
  so there is nothing a check would protect.
- A location that has been `live` never returns to `draft`, so a public address never
  becomes a 404. `paused` is the way to stop selling a place for a while: a closed road,
  an off season.
- A location can be deleted, with its pages and saved addresses (PR 6). One that has
  never been live goes on a plain question. One that has been live has a public
  address, which the delete turns into a 404 that links break on and search engines
  drop, so the admin types its slug to confirm. The reasons are in
  `261003-location-flow.md`.
- Marketing makes every move. Going live on the CEO's word is a working rule, not a
  check in code; restricting it to `SUPER` is future work.
- `retired` (a permanent redirect) waits for the redirect table at cutover.

### The pages of a location

- `/[location]` is the landing page. It introduces the place and links to the product
  pages that are published.
- `/[location]/[product]` is one page per product. The products are the list in code,
  `car-with-driver` and `coach-charter` today. A new product is a code change, and it
  then appears as a page on every location.
- A page is published or it is not (PR 5). Until then each page also had a switch,
  **On**, beside its publish; the two had nearly the same states, so the switch went.
  The statuses are "Not published", "Published" and "Published, edits waiting": the
  public still sees the copy last published, and the draft holds newer edits.
- "Unpublish" takes a page from the public and keeps its text; "Publish" brings it back.
  A product page that is not published sends the visitor to the location's landing
  page. The landing page cannot be unpublished once the location has left `draft`.
- Whether a page is published says whether the page exists. It does not say whether the
  product can be booked there: coverage is one switch per district for every product,
  and per-product coverage is future work.
- The redirect from a product page that is not published is temporary (307), since the
  page can be published again (PR 4).

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
- A class's starting price is the least it can cost before any state's multiplier: its
  minimum one-way fare, or its shortest hourly hire when that is less (PR 4).
- The order on a page (PR 4). Landing: the hero with the search card, the links to the
  products, the intro, the highlights, the FAQs. Product: the hero with the search card,
  the vehicle classes, the intro, the FAQs, then links to the landing page and the
  location's other products. A part with nothing in it is left out.
- The image shared on social media is the hero image.
- Every page must be complete before it can be published. The limits live in one module
  and are unit-tested.
- The limits the table leaves open, chosen in PR 3. Characters: hero headline 80, hero
  subheadline 160, intro 5,000, FAQ question 160, FAQ answer 1,000, highlight name 60,
  highlight text 300, alt text 160. A page holds at most 12 FAQs and 8 highlights.
- A new line starts a new paragraph, in the intro and in an FAQ answer.

### Editing: one draft, then Publish

- Each page has a working draft and a published copy. "Save draft" overwrites the draft
  and changes nothing in public. It checks nothing but the length limits.
- "Publish" checks the draft is complete, copies it to the published copy and refreshes
  the public page. It works in any location state.
- On a location that is `live` or `paused`, publishing asks first, "Publish? This goes
  public at once.", and so does unpublishing (PR 5). A draft location's page does both
  without a question.
- The editor shows whether the draft differs from what is published, and says what the
  public sees: "The public still sees the copy published 3 Oct 2026. Publish to replace
  it." (PR 5).
- There is no version table. Every publish is written to the activity log with who,
  when, and the content before and after. To roll back, Marketing opens the entry in the
  location's history, puts the old text back and publishes again. The entry opens on a
  page of its own that shows the content before and after, with the parts that differ
  marked (PR 3).
- "Publish" publishes what is in the form, saved or not: it saves the draft and copies it
  in one step (PR 3).
- Two admins on one page: a save is refused when the page changed since the form was
  opened, with "This page was changed by someone else. Reload to see it." Unpublishing
  is not a change to the page's content: a form open on it still saves (PR 3, for the
  switch a page had then).

### The preview page

- Every location has a second address on the customer site, for staff only:
  `/preview/[location]` and `/preview/[location]/[product]`. The public pages stay at
  `/[location]`; there is no `/live/...`.
- The preview page is the public page's own components, fed the working drafts in place
  of the published copies. It shows them whatever the state and whether a page is published, so
  it is where staff check a draft location before it goes live, with no state of its own
  for that (PR 5), and it also serves to check an edit to a live page before publishing
  it. A bar on top says "Preview" and whether the draft differs from what is published.
- It opens only for a signed-in admin who holds `locations.manage`, asked the way every
  admin screen asks. A signed-out visitor is sent to sign in; anyone else gets a 404.
  Both apps use one Clerk application, so at worst an admin signs in once on the
  customer site.
- "Preview" on the location's page in the admin is a plain link to it. There is no
  signed link and no Draft Mode.
- The preview page is never cached.
- Built in PR 4:
  - The bar also names the location's state and the status of the page shown, and links
    the location's three pages, published or not. The links on the page itself follow
    the public rule (the products that are published) and stay inside the preview.
  - The page editor has its own link, "Preview" (PR 5; "Preview the saved draft" until
    then), to the preview of the page being edited. The preview shows what was last
    saved, not what is in the form.
  - The preview has no layout file. The access check is in each of its two pages, as on
    every admin screen, and sign-in comes back to the page that was asked for.
  - The address is checked before the session is read: the proxy attaches no session to
    a path that looks like a file, and reading one there would be an error, not a 404.

### Saved addresses

- A location has a list of saved addresses, kept by Marketing: the places most customers
  go to there, such as "Langkawi Airport", "Kuah Jetty" or "Pantai Cenang".
- Each is a name and an exact Google place, picked by search: a spot, never an area. The
  name is filled from the place and can be changed. Marketing sets the order.
- An address has to be in one of the location's districts, placed by its coordinates
  (PR 5). Saving refuses a new one that is not and says where it lies, and the districts
  cannot be changed so that a stored address is left outside. One stored before the rule
  stays and is marked in the list.
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
- What the layout holds is the card's state (`SearchProvider`); each page places the card
  on the floor of its hero, as the home page does. So what was typed stays while the
  customer moves between a location's pages (PR 4).
- No area goes into a booking. The customer's place search offers exact spots only, and
  a location is an area with no address of its own, so the location itself is never sent
  as the drop-off.
- The drop-off starts empty. Opened with nothing typed, it offers the location's saved
  addresses under a heading such as "Popular in Langkawi"; one pick fills an exact
  place, ready to send. Typing brings the normal search for exact places.
- The saved addresses are offered on the drop-off only. The pickup is left empty and
  searches as it does everywhere.
- "Take me here" on a highlight fills the drop-off with that highlight's saved address,
  ready to send, and brings the card into view, as the home page's KLIA card does. It
  sets the trip to one-way, since an hourly trip has no drop-off.
- All the tabs stay. On a product page the card opens on that product's tab. Moving to
  another product's page moves the tab; moving to the landing page leaves it (PR 4).
- While the location is `paused`, a short notice takes the card's place and "Take me
  here" is not shown.

### Slugs

- Suggested from the name by `slugify`, and editable by Marketing while the location is
  `draft`.
- Locked the first time the location goes live. Renaming a live slug needs the redirect
  table and waits for it. Until then a wrong slug is put right by deleting the location
  and adding it again (PR 6).
- Reserved words are refused, from one list: the site's own top-level paths (`account`,
  `booking`, `preview`, `sign-in`, `sign-up`, `api`), the product slugs, the locale codes (`en`,
  `ms`, `zh`), and the names `04` sets aside (`admin`, `search`, `manage`, `quote`,
  `packages`, `vehicles`, `transfer`, `driver`, `sitemap`, `robots`). A new top-level
  route on the customer site is added to this list in the same PR.

### Who does it

- A fifth team, `MARKETING`, with one permission, `locations.manage`: add a location,
  keep its saved addresses, write, publish and unpublish its pages, change its
  state and mark the top choices.
- Operation keeps the district switch. It does not show, hide or change a location.
- Any Marketing admin edits any location. There is no assignment per location; the
  history shows who did what.

### Images

- Images are uploaded from the page editor to UploadThing. The content keeps the file's
  address and key, its width and height, and its alt text.
- The file goes through the admin's server, which holds the token and sends it on
  (`UTApi`), so no callback from UploadThing has to reach the app (PR 3). The server
  reads the type and the size from the file's bytes, not from what the browser says.
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
- The control is on the Home page screen, `/home-page` (PR 5; it was on each location's
  page from PR 3): the three slots in order, "Add" puts a live location not yet chosen
  last, "Up" and "Down" move one a place, "Remove" takes it off. The places are kept as
  1, 2, 3 with no gaps, and every location whose place moves is logged.
- The KLIA card stays as it is, hard-coded, filling the pickup into the search card.
- The row is centred, so fewer cards make a shorter row and not a gap. A location card
  says "Explore this location" where the KLIA card says "Book for this location" (PR 4).
- A top choice that is `paused` is left off the home page. It keeps its place and comes
  back when the location is live again.
- With fewer than three top choices the row is shorter. The cap is one constant.

### Locale

The page rows are keyed by locale from the start and every row is `en`. Nothing else is
built: no `/ms/...` routes, no language switch. Malay pages are future work.

## Where this departs from `04`

| `04` and `05b`                                   | Here                                                    |
| ------------------------------------------------ | ------------------------------------------------------- |
| Five states, with `retired`                      | Three. `retired` waits for the redirect table           |
| `preview` reached with a signed cookie           | A staff-only page, `/preview/[location]`                |
| Two indexing tiers, a readiness gate for tier 1  | No indexing until cutover. Every page must be complete  |
| `robots.txt` disallow off the indexable host     | The noindex header alone, on every host, until cutover  |
| Similarity check between locations               | Not built                                               |
| Sections that admins reorder and hide (D3)       | A fixed order of fixed fields                           |
| Locale in the routing from the first commit (D1) | Locale in the data only                                 |
| Media on Vercel Blob (D10)                       | UploadThing                                             |
| Product availability per location (D14)          | Whether the page is published, which is not bookability |
| A content editor role scoped to locations (§9)   | The Marketing team, no scope                            |
| Drizzle recommended (§3)                         | Prisma, as the app already uses                         |
| Sitemap, redirect table, product hubs, packages  | Not in this plan                                        |
| Nothing ties a location to coverage              | The same; a location names its districts as information |

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
               districtCodes String[]   (the districts Marketing ticked; no relation)
               state String             ("draft" | "live" | "paused")
               wentLiveAt DateTime?     (set once; from then the slug is locked)
               topChoiceOrder Int?      (null: not on the home page)
               createdAt, updatedAt
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
| `location.created`           | after: name, slug, district codes                           |
| `location.updated`           | before and after of the changed fields, top choice included |
| `location.addresses.updated` | before and after: the saved addresses, in their order       |
| `location.state.changed`     | before and after: the state                                 |
| `location.page.published`    | the page, and its content before and after                  |
| `location.page.updated`      | the page, and whether it is published, before and after     |
| `location.deleted` (PR 6)    | before: the name, the slug, the districts and the state     |

Saving a draft is not logged. A change to the same values logs nothing, as elsewhere.
A publish is one entry, and an unpublish is `location.page.updated`, read as
"Unpublished the Coach charter page" (PR 5). An entry from before PR 5 keeps its
sentence, since the log is never rewritten: one that names the `preview` state, or one
of a page being turned on by the switch it had.

## The admin screens

Sidebar group "Marketing", items "Locations" and "Home page", permission
`locations.manage`. The location screen and the picker are as PR 5 left them.

- **`/locations`**: one row per location with its name and slug, its districts and their
  states, its state badge, which pages are published, its top-choice place and when it last
  changed. "Add location" above the list.
- **`/locations/new`**: the name, then the slug, filled from the name and editable, then
  the states as checkboxes and under them the districts of each ticked state, then the
  tagline. A dot beside each district says whether pickups are on there, green for on
  and a grey ring for off; the info tooltip says what the dots mean.
- **`/locations/[id]`**:
  - The header: the state badge beside the name, and beside "Preview" (a link to the
    preview page on the customer site) the one move the state allows: "Go live", "Pause"
    or "Resume". While the move is blocked its button is disabled and one line under the
    header says what to do first ("Publish the landing page", "Publish the changes on
    the Coach charter page"). There is no State card.
  - Pages: a row each for Landing, Car with driver and Coach charter, with its status
    ("Not published", "Published", "Published, edits waiting") and "Edit".
  - Details: name, slug (read-only once live), tagline, and the ticked districts as a
    list, each with the picker's dot. "Edit districts" opens the picker in the list's
    place. There is no Pickups card.
  - Saved addresses: the list in its order, each with its name and its place. "Add
    address" opens the place search for exact spots; an address can be renamed, moved
    and removed. One outside the location's districts is refused on Save.
  - The location's history.
  - Delete (PR 6): on a plain question while the location has never been live. Once
    it has, the card says what the delete costs and asks for the slug to be typed.
- **`/locations/[id]/pages/[page]`**: the fields above with their limits shown as they
  are typed, the image uploads, the saved address chosen on each highlight, a list of
  what is still missing, "Save draft", "Publish" and, once the page is published,
  "Unpublish" (PR 5). Where the location has no saved address, a highlight
  says "Add saved addresses on the location first", a link to the location's list
  (PR 5).
- **`/home-page`** (PR 5): the top choices, as three slots in order, each with the
  location's name, tagline and state, "Up", "Down" and "Remove", and "Add" from the live
  locations not yet chosen. Anything else the home page comes to need from Marketing
  lives on this screen.
- **`/locations/[id]/history/[entryId]`**: one publish from the history, the page before
  and after.

Explanations sit behind the info tooltip, as on the other screens.

## The customer site

```
app/(location)/[location]/layout.tsx           the frame and the search card's state
app/(location)/[location]/page.tsx             landing
app/(location)/[location]/[product]/page.tsx   one file for every product
app/(location)/preview/[location]/...          the two pages again: the drafts, staff only
app/_location/                                 the components and readers they share
app/api/revalidate/route.ts                    refreshes cached pages
```

- An unknown slug, a `draft` location and an unknown product are a 404.
- The public files and the preview files are thin: both render one set of page
  components, and differ only in the reader they call and in the preview's access check.
- The pages are in a route group of their own, `(location)`, not in `(site)` (PR 4). The
  `(site)` layout reads the session for its header and holds every page in one narrow
  column. A location's address is whatever follows the first slash, so its routes also
  receive every stray request (`/favicon.ico`, `/wp-login.php`), some of which the proxy
  attaches no session to. So these pages do not read the session on the server: the
  header asks the browser whether someone is signed in, and a stray request gets a 404.
- A text that could not be a location's slug is turned away before the database or the
  cache is asked (PR 4).
- The pages are in the family of the home page (`260923-home-design.md`): its fonts,
  colours, header, closing call and footer. The page design is reviewed on staging in
  PR 4.
- Text, vehicle classes and FAQs are in the server-rendered HTML.

### Keeping the pages fresh

`web` and `admin` are two Vercel projects, so the admin cannot refresh the customer
site's cache by itself.

- The customer site reads published locations through a cached reader, tagged per
  location, with tags for the home page's top choices and for the vehicle classes.
- After a publish, an unpublish, a state change, a saved address change, a top-choice change
  or a vehicle class change, the admin's server action calls the customer site's `/api/revalidate` with
  the tags and a shared secret.
- As built in PR 4:
  - The tags are `location:<slug>`, `top-choices` and `vehicle-classes`, named in
    `cache-tags.ts` of `@repo/db` for both apps.
  - A change to a location's name, tagline or districts refreshes too: the pages and the
    home page card show the name and the tagline. Every location change also refreshes
    the top choices, since a card shows the name, the tagline and the hero image.
  - The call is made after the action has answered, so a slow customer site never slows
    the admin. It carries the secret as a bearer token.
  - A refreshed tag expires at once: the next visitor reads what was just saved.
  - What is cached is the data, not the page. A location that is not public is cached as
    "nothing here" like any other answer, and going live refreshes that too.
  - Locally the admin's `SITE_URL` has to point at the customer site's dev server for
    the refresh and the Preview links to reach it.
- If that call fails the change is still saved, and a one-hour refresh behind the tags
  catches the page up.
- One secret, `REVALIDATE_SECRET`, set to the same value in both apps, authorises this
  call. It is a random string we make up, not a key from a service.
- The preview page reads the drafts directly and takes no part in this.

## Module changes

| Module                                 | Change                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roles.ts`                             | `ADMIN_TEAMS` gains `MARKETING` and its label                                                                                                                                                                                                                                                                                                                        |
| `permissions.ts`                       | `locations.manage`, for `MARKETING`                                                                                                                                                                                                                                                                                                                                  |
| `location-input.ts`, new               | Browser-safe: the states and their moves, the reserved slugs, the rule of the On switch, the parsers. Unit-tested. PR 5: three states with one move each, and the rule of unpublishing in place of the switch's                                                                                                                                                      |
| `location-page-input.ts`, new          | Browser-safe: the page keys, the content shape, the limits, `missingFields`, the image rules. Unit-tested                                                                                                                                                                                                                                                            |
| `location-places.ts`, new (PR 5)       | Server only: whether a saved address lies in the location's districts, placed by its coordinates, and the sentence that says where one outside lies. Unit-tested                                                                                                                                                                                                     |
| `locations.ts`, new                    | Create and update a location, keep its saved addresses, change its state, save and publish a page, flip a switch, set top choices; every write logged in its transaction. The readers for the admin and for the customer site. PR 5: `unpublishLocationPage` in place of the switch's writer, and a reader lists the live locations that can be added as top choices |
| `location-view.ts`, new (PR 4)         | Browser-safe: a location as the customer site shows it, built from its rows as the public view or as the preview, the top choice card, and the paths of the pages. Unit-tested                                                                                                                                                                                       |
| `cache-tags.ts`, new (PR 4)            | Browser-safe: the tags the customer site caches under and the admin names, and the refresh route's path. Unit-tested                                                                                                                                                                                                                                                 |
| `session.ts`, `origins.ts` (PR 4)      | `getAdminAccess(permission)`, shared by the console and the preview. `SITE_URL` and `ADMIN_URL` read in one place, for the emails, the canonical address and the admin's calls                                                                                                                                                                                       |
| `pricing.ts`, `vehicle-class-input.ts` | `startingPriceSen` and `seatsLabel`, for the vehicle classes on a product page; the booking forms use the same seats wording (PR 4)                                                                                                                                                                                                                                  |
| `activity-actions.ts`                  | The `location` entity type, the six actions and their sentences                                                                                                                                                                                                                                                                                                      |
| `coverage.ts`                          | `listDistricts` reads the districts of the codes it is given, for a location's own                                                                                                                                                                                                                                                                                   |
| `apps/admin/.../locations`, new        | The four screens, their server actions and the upload route                                                                                                                                                                                                                                                                                                          |
| `apps/admin/.../home-page`, new (PR 5) | The Home page screen: `TopChoiceControl` over the whole list, and its action. `nav.ts` lists it under Marketing                                                                                                                                                                                                                                                      |
| `apps/admin/app/_lib`                  | The call to the customer site's refresh route, and the address of the preview page. The "signed-in admin who holds this permission" check of `access.ts` moves to `@repo/db/server`, shared with the preview page                                                                                                                                                    |
| `apps/admin/.../vehicle-classes`       | Calls the refresh after a change                                                                                                                                                                                                                                                                                                                                     |
| `apps/web/app/(location)`, new         | The layout and the two pages, with their metadata and structured data, and under `preview` the two pages again over the drafts, behind the access check. Their shared components and readers are in `app/_location` and `app/_lib/locations.ts`                                                                                                                      |
| `packages/ui` `place-input.tsx`        | `PlaceInput` takes `presets`: the places an empty field offers when it is opened, under a heading (PR 4)                                                                                                                                                                                                                                                             |
| `apps/web/app/_components/search`      | `ServiceTabsSearch` takes the saved addresses its drop-off offers before anything is typed, and opens on the tab of the product page it is on. The provider that lets a card fill it moves here from `_home` and carries a resolved place, for "Take me here"                                                                                                        |
| `apps/web/app/_home`                   | The destination cards read the top choices; `destinations.ts` keeps only KLIA                                                                                                                                                                                                                                                                                        |
| `apps/web/next.config.ts`              | `X-Robots-Tag: noindex` on every response                                                                                                                                                                                                                                                                                                                            |
| `next.config.ts`, both apps            | The UploadThing image host: the admin's in PR 3, the customer site's in PR 4                                                                                                                                                                                                                                                                                         |
| `turbo.json`, both `.env.example`      | `UPLOADTHING_TOKEN`, for the admin app only, in PR 3; `REVALIDATE_SECRET` in PR 4                                                                                                                                                                                                                                                                                    |

## Build order

Six PRs into `main`. Each passes `pnpm lint` and `pnpm check-types` and leaves both
apps working.

| PR  | Title                                       | Holds                                                                                                                                                                                                                  |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docs: add the locations plan`              | This document                                                                                                                                                                                                          |
| 2   | `feat: locations in the admin`              | The schema, the Marketing team, the states and slugs of `location-input.ts`, creating and updating a location, their log actions, `/locations`, `/locations/new`, the details and saved addresses of `/locations/[id]` |
| 3   | `feat(admin): location page editor`         | The content shape and its limits, save and publish, the On switch, uploads, the saved address on a highlight, the state moves, the top choices, the rest of the log actions and the history                            |
| 4   | `feat: location pages on the customer site` | The public pages, the preview page, the refresh route and the admin's calls to it, the noindex header, structured data, the search card with the saved addresses and "Take me here", the home page cards               |
| 5   | `feat(admin): simpler location flow`        | `261003-location-flow.md`: three states, pages published or not with no switch, the state and its move in the location's header, the districts in Details, the Home page screen, the editor's hint for saved addresses |
| 6   | `feat(admin): delete a location`            | Delete for any location, gated by typing its slug once it has been live, its log entry, and the name the log keeps for a deleted location                                                                              |

What the developer does by hand:

- PR 2: `pnpm db:push`, then `pnpm db:push:prod` before the merge. Give a Marketing
  admin the team on the Admins page.
- PR 3: create the UploadThing app and set `UPLOADTHING_TOKEN` for the admin app, in
  `apps/admin/.env.local` and on Vercel. The token alone is enough; the separate secret
  key is for the older SDK.
- PR 4: set `REVALIDATE_SECRET` to the same value in both apps, locally and on Vercel.
  The admin app already has `SITE_URL`.
- PR 5: before the merge, move any location still in `preview` to `live` or back to
  `draft`, in both databases. There is no schema change and no push.

After PR 2 Marketing can add locations and their saved addresses. After PR 3 it can write and publish their pages,
and nothing is public yet: a location can be moved to `live` in the admin, but the
customer site has no location pages until PR 4 makes them reachable.

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
- A boundary of its own for a location, if something ever has to place a point in one.
- Per-product coverage, when a district has cars but no coach.
- A version list with a restore button, if rolling back by hand proves too slow.
- Clearing replaced images from UploadThing.
- Destination cards on the home page beyond three.
