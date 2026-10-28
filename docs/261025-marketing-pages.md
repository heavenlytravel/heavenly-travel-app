# Marketing pages: sections under a location, site pages, blog

Status: planned on 2026-10-25 and built in the same working tree. Every answer marked
**(assumed)** was taken so the work could go ahead; the list under "Questions to
re-decide" names each one with the other choice. What was added on instinct, beyond the
brief, is listed apart under "Added on instinct". Where this document differs from
`261001-locations-and-pages.md`, this one wins.

Today a location has a main page and one page per product, `car-with-driver` and
`coach-charter`, each written in the page editor and published. The main page carries
highlights, each a name, a text, an image and an optional saved address. The home page,
the header, the footer and the closing call are hard-coded, and the site has no about,
contact or legal pages.

This plan turns a location's pages into **sections**, each with its own page and, for most,
pages under it: one per vehicle class for the transport products, and pages Marketing adds
on demand for popular places, attractions, hotels and blog posts. It adds **site pages**
that belong to no location: the home page's content, about us, contact us and the three
legal pages. It also reworks the search card's fields, the header, the footer and the
closing call.

## Decisions

### A location's site is sections

| Section           | Its own page                | Pages under it                                             | Bookable now |
| ----------------- | --------------------------- | ---------------------------------------------------------- | ------------ |
| (main page)       | `/langkawi`                 | none                                                       | yes          |
| `car-with-driver` | `/langkawi/car-with-driver` | one per class on offer: `/langkawi/car-with-driver/sedan`  | yes          |
| `coach-charter`   | `/langkawi/coach-charter`   | one per class on offer: `/langkawi/coach-charter/coach-44` | yes          |
| `car-rental`      | `/langkawi/car-rental`      | one per class, once car rental has classes                 | no           |
| `attractions`     | `/langkawi/attractions`     | added on demand: `/langkawi/attractions/escape`            | no           |
| `hotels`          | `/langkawi/hotels`          | added on demand, as attractions **(assumed)**              | no           |
| `popular-places`  | `/langkawi/popular-places`  | added on demand: `/langkawi/popular-places/eagle-square`   | n/a          |
| `blog`            | `/langkawi/blog`            | added on demand: `/langkawi/blog/a-day-in-kuah`            | n/a          |

- The sections are a list in code, in this order. A new section is a code change and then
  appears on every location, as a product did.
- A page under a section is public only while its section's own page is public. So
  Marketing publishes "Popular places" before any popular place shows, and the breadcrumb
  of every public page leads somewhere.
- The address of a page is `/[location]`, `/[location]/[section]` or
  `/[location]/[section]/[slug]`. Nothing deeper.

### What a page holds depends on its kind

One content shape for every page, as today; each kind uses some of its fields and checks
its own minimums before a publish. Highlights leave the shape (see "Popular places").

| Kind       | Pages                                                           | Needs to publish, beyond the meta title and description and a hero headline and subheadline | Optional             |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| `landing`  | the main page                                                   | hero image, intro of 100 words, 3 FAQs                                                      | tagline              |
| `service`  | car with driver, coach charter, car rental, attractions, hotels | hero image, intro of 100 words, 3 FAQs                                                      |                      |
| `listing`  | popular places, blog                                            | hero image                                                                                  | intro, FAQs          |
| `class`    | a class under car with driver or coach charter                  | hero image, intro of 100 words, 3 FAQs, and the class on sale at the location               |                      |
| `place`    | a popular place, an attraction, a hotel                         | hero image, intro of 100 words                                                              | FAQs, saved address  |
| `article`  | a blog post                                                     | hero image (the cover), body of 100 words, every body image uploaded here with alt text     | FAQs                 |
| `home`     | the home page                                                   | hero image                                                                                  | tagline, intro, FAQs |
| `document` | about us, contact us, terms, privacy, refunds                   | body of 100 words, every body image uploaded here with alt text                             | hero image, FAQs     |

- On a place, an article and a document, the hero headline is the page's name: the card,
  the breadcrumb and the admin's lists show it. The subheadline is the line under it, and
  on a card. The editor labels them "Name" or "Title" and "Short description" there.
- The share image, as today, is optional on every kind.

### Class pages follow the class on sale

- Under car with driver and coach charter, the Pages tab lists every class the location
  offers in that product, on sale or not. Each can have a page, keyed by the class's slug,
  which never changes.
- A class page can be published only while the class is on sale at the location (the
  offering is on) and in the catalogue. "Turn Sedan on for Langkawi first, on the Vehicle
  classes tab."
- When the class is turned off there, its page is **paused**: it keeps its text and its
  published copy, the admin shows "Published, paused: the class is off here", and a visitor
  is sent to the section's page (temporary, 307). Turning the class on again brings the page
  back with no publish.
- A class page shows the class from data, as the product page lists it today (picture,
  models and photos, seats, luggage, "from" price), then the intro and FAQs and links to
  the other classes. On the product page each class card links to its page while it is
  public.

### Pages added on demand

Popular places, attractions, hotels and blog posts:

- The plus by a section on the Pages tab ("Add popular place") asks for the title (a
  place's name, a post's title) and the slug, made from the title until it is edited, and
  opens the new page's editor. The section is the one the plus is by.
  The slug is unique within the section, and the field says where the page will be as it is
  typed, as a location's slug does.
- The slug can be changed until the page is first published, then it is locked: a new
  address needs the redirect table at cutover, as for a location.
- Delete is on the editor. A page that was ever public asks first, since its address
  becomes a 404.
- Popular places, attractions and hotels are shown in Marketing's order, with Up and Down
  on the section's list. Blog posts are shown newest first, by their first publish.
- A section takes any number of them (decided in review, 261025).

### Popular places replace highlights

- Highlights become popular places: each is a page at
  `/langkawi/popular-places/eagle-square`, with an optional saved address.
- The main page shows every public popular place as a card: the hero image, the
  name, the short description, "Take me here" when it has a saved address, the whole card a
  link to its page. "All popular places" opens the section's page.
- A popular place's own page has "Take me here" under its headline, on the hero. Its intro
  and FAQs follow, then three other popular places.
- `db:migrate-popular-places` turns each location's highlights into popular place drafts:
  the name as the headline and slug, the first 160 characters of the text as the short
  description and the whole text as the start of the intro, the image as the hero, the
  saved address kept. They are drafts, not published: none has the SEO fields or the intro
  a page needs. Until Marketing publishes them and the Popular places page, a main page
  shows no popular places; the live main pages lose their highlights at the deploy, a gap
  accepted in the fourth review (261026) while Marketing completes them. Run on
  production on 2026-10-26, after the schema push and before the deploy, so the live
  console never counted the highlights' photos as unused.
- Saved addresses stay on the location. A popular place, an attraction or a hotel may point
  at one; removing an address that a page uses asks first and names the page.

### Places: one catalogue in three lists

Decided in review (261025): popular places, attractions and hotels are one catalogue of
places.

- A place's type is the section it is under: popular place (what a highlight was),
  attraction or hotel (`PLACE_SECTIONS`, `PLACE_TYPE_LABELS`). Its address follows its
  type, `/langkawi/attractions/skycab`, so an attraction keeps the address it will need
  once tickets can be booked. The type is the section it is added from, and changes with
  the slug, in the editor's "Type and slug", until the first publish.
- A place is in one list. One that belongs in two is two pages, one in each, each with its
  own name and text, which may point at the same saved address: the Westin as a hotel to
  stay at, and its beach among the attractions. Decided in the fourth review (261026),
  which dropped listing one page under another list too ("Also listed under") as more
  complicated than it is worth. Two pages with the same text would compete in search
  engines, so each needs its own angle.
- A saved address can be given its page as it is added to the Saved addresses list: "Its
  page" makes it a popular place, an attraction or a hotel, a draft named as the address
  and pointing at it (`addLocationAddress` with a page).

### Services not bookable yet

Car rental, attractions and hotels have their pages now so the content can be written,
previewed and published (kept in review, 261025):

- Their pages can be published. The search card stays on them, open on car with driver,
  and a short notice says online booking of that service is coming, with WhatsApp.
- Their tabs on the search card stay disabled and marked "Soon", as today.
- No page is indexed before the cutover anyway: the customer site answers every response
  with `X-Robots-Tag: noindex` (`261001`, "Search engines"). Publishing now does not start
  indexing; it makes the pages ready for the day the header is lifted.

### Cards show the page's hero image

Every card that opens a page shows that page's hero image: the services on the main page,
the classes, popular places, attractions, hotels and posts. A card whose page has no image
yet shows the plain tint.

### The main page, in order

The hero with the search card; "Plan your trip in Langkawi", a card per public service page;
the intro; popular places; the three newest posts; the FAQs; the closing call.

### The blog

- A post is Markdown. The editor is a text area with a toolbar (heading, bold, italic,
  link, list, quote, image) and a live preview beside it, rendered by the same component as
  the public page.
- "Import .md" reads a Markdown file written elsewhere. Front matter `title`,
  `description` and `summary` fill the title, the meta description and the short
  description; a first `# Heading` with no `title` becomes the title and leaves the body.
- Every image must be uploaded here. An imported image that links elsewhere is listed with
  "Upload", which replaces it in the text; the publish check names any left. The toolbar's
  image button uploads and inserts `![alt](url#1200x800)`: the size in the fragment lets
  the page reserve the image's box, so nothing jumps as it loads.
- A `#` heading in a body is shown as a second-level heading: the title is the page's only
  first-level one. Raw HTML is not rendered.
- A post shows its first publish date, and "Updated" when a later publish changed it. It
  carries `Article` structured data.
- The same editor writes the site's documents (about us, terms and the rest).
- The blog reads as a blog: its own page and its posts open with the title, the summary
  and the cover, with no search card anywhere on them. Their closing call's "Get my price"
  opens the location's main page at its card.

### Site pages

Pages of the whole site. Since the third review (261025) they are in the console's Pages,
as the website's: SUPER sees them in Pages across locations, beside every location's,
under the location filter's "Website", and edits them at `/pages/website/about-us`
(`website.manage`); Marketing keeps the locations' pages. The home page's top choices,
which are saved at once, sit under the home page's editor. The Website screen and the
Home page screen before it are gone.

| Page           | Address           | Kind       |
| -------------- | ----------------- | ---------- |
| Home page      | `/`               | `home`     |
| About us       | `/about-us`       | `document` |
| Contact us     | `/contact-us`     | `document` |
| Terms          | `/terms`          | `document` |
| Privacy policy | `/privacy-policy` | `document` |
| Refunds        | `/refund-policy`  | `document` |

- The home page's tagline is the handwritten word over the headline ("Travel"), its hero
  the photo, and its intro and FAQs new sections under the top choices when filled. Until
  it is first published the home page shows what it shows today, and its title and
  description stay as they are.
- A document that is not published is a 404, and the footer leaves its link out.
- Contact us shows the company's details under its text, from code.
- The home page stays published once published; the documents can be unpublished.
- Each new address is added to the reserved slugs. A site page previews at `/preview` and
  its address, `/preview/about-us`, the home page at `/preview`, as a location's page
  does (decided in the fourth review, 261026, when `/preview/site/about-us` read wrong
  beside the console's `/pages/website/about-us`).
- Starting text for about us, contact us, the terms, the privacy policy and the
  cancellation and refunds page was drafted on 2026-10-25 from how the app works, and
  imported on dev as drafts. What the app does not settle is marked **[TO CONFIRM: …]**
  for the CEO (OP0-17). The privacy notice also needs its Malay version.

### The search card

- Each field's label has its icon before it: Trip, Pick-up, Drop-off, Hours, When, and
  the fields of the other tabs. The calendar icon inside the When box goes.
- A filled Pick-up, Drop-off or When box has an × at its end that empties it and puts the
  cursor back in it.
- On a location's pages the Pick-up offers the saved addresses too, under "Popular in
  Langkawi": those where a pickup is served, as the drop-off offers those where a trip may
  end.
- Where the search looks, decided in review (261025): not locked to the location. A
  location's page starts there, but a customer can search and book anywhere from it, as on
  the home page. Both fields search all of Malaysia and rank places in the location's area
  first (a location bias, the box the card kept to before). "Get my price" opens the options
  page as the home card does, which finds the location from the pick-up and prices the trip
  or refuses it with the home page's answers. The card's own check before the options page,
  and the "Nothing found around Langkawi" answers, go.
- An empty field still offers "Popular in Langkawi". "Take me here" still offers only the
  saved addresses a trip from the location may end at, as the drop-off's list does.

### The console's Pages

Decided in review (261025), after mock-ups of two layouts:

- A location's Pages tab, `/locations/langkawi/pages`, is one tree of every page of the
  location: the main page, then each section's own page with every page under it, tied to
  it by a line. A chevron folds a section's pages away; folded sections stay folded while
  the console is open in the tab. Its columns are the page, its Status (not published,
  published, edits waiting, paused) and its SEO switch (on or off); Edit and Preview are
  icons. It filters by section and status and searches names and addresses, all kept in
  the address. A section's plus adds a page to it. The saved addresses follow.
- The filters are one bar over the table (decided 261028, after the chips wrapped to
  several lines and the location sat in the page's heading): the search, then a dropdown
  each for the location (on `/pages`), the section and the status, one choice each, a
  choice other than "All …" tinted. "Collapse all" folds every section, "Expand all" opens
  them again. On a phone the search takes a line and the rest go two to a row.
- A row opens its page wherever it is pressed, as its name does: a section's row its
  list, any other row its editor. The pencil always opens the editor.
- A section's list is the tab narrowed to it, `/locations/langkawi/pages?section=car-with-driver`,
  where its row and its sidebar row lead: its own page with every page under it, a
  place's saved address or a post's first publish as a column, a place's order with Up
  and Down, and a line under a section with nothing yet.
- Every editor is under the tab at the page's address on the site, the main page at
  `main` (decided in the fourth review, 261026, the addresses having read as muddled):
  `/locations/langkawi/pages/main`, `…/pages/car-with-driver`,
  `…/pages/car-with-driver/sedan`. No address ends in `/edit`, so no slug is kept back. An
  old `…/pages/landing` goes on to `…/pages/main`.
- Adding a page fixes its section: an attraction is added from Attractions. A place may
  start with a saved address, chosen or added in the dialog. A place's editor can add a
  saved address too. One dialog adds a saved address everywhere, and saves it at once.
- The saved addresses list saves each change at once: an address added, renamed, moved
  or removed. Its search covers the location's states, all of Kedah for Langkawi (decided
  in the fourth review, 261026): Google keeps a search to a box at best, and the box around
  Kedah holds Penang, so a suggestion whose second line names another state ("George Town,
  Penang") is left out (`suggestionStateOf` in `@repo/places`). The place picked is still
  held to the states by its coordinates. Its results take their room in the dialog, which
  grows to show them.
- Pages across locations, `/pages`, under Manage on All locations: every location's pages
  in the same tree, and for SUPER the website's, filtered by location (or Website),
  section and status, with a search. A location's page opens its editor inside its
  location, a section's row its list there. The picker moves between it and a location's
  Pages.
- The editor's second tab is "SEO" (it was "Search and sharing"); the switch on it is
  "Search engine optimisation (SEO)", and the lists show it as "SEO: On" or "Off".
- `pageEditorPath` names an editor's address once, for the console and for the
  preview's Edit.

### The preview bar

Decided in review (261025): a floating bar at the foot of the preview, so the page shows
as the public sees it. It names the page and its standing, and has Pages, Edit and a fold.
Pages opens a picker of every page of the location, grouped by section with each one's
standing and a search; on a site page, the site pages. Edit opens the page's editor in the
console (`ADMIN_URL` with `pageEditorPath` or `sitePageEditorPath`).

### What the preview shows of an empty part

Decided in the third review (261025): in a staff preview, never on a public page, every
part a page holds but has nothing in yet shows where it would be. In the fourth review
(261026): in the page's own layout, its section's heading and columns kept and the dashed
box only where the missing content goes (an empty intro is "About Langkawi" on the left
and the box on the right), with one short line: "Add an intro to publish", "Add at least
3 FAQs to publish", "No FAQs yet · optional". The hero image's box is its photo's frame,
a saved address's the size of "Take me here", a subheadline's a line high. A list with
nothing published under it says so ("No popular places published yet"); a field shown
with a fallback, such as a headline falling back to the page's name, gets a small mark
instead. The words come from `PAGE_KIND_RULES` and `PAGE_LIMITS` (`emptyPartsOf`,
`MissingPart`, `MissingMark` in `page-parts.tsx`).

### Search engines, page by page

Decided in review (261025), as `261001` planned for the cutover: a page's "Search engines"
switch, on the SEO tab, on by default (`indexable` in its content, so it
changes with a publish).

- Off, the page asks search engines not to list it (`robots: noindex, follow`). It stays
  public by its link, and shared links still show its title and image.
- The editor says what each position means, and before a publish that changes it, what the
  publish will do: search engines asked to drop the page, which can take days or weeks to
  leave their results and as long to come back; or allowed to list it again.
- Until the cutover every page is hidden anyway by the site's `X-Robots-Tag` header; the
  switch counts from then. A list shows "Hidden from search" on such a page.

### The header

The header of the home page, the location pages and the site pages shows the logo and the
account buttons only. The section links go, to come back when the home page has more
sections.

- Signed out: "Sign in", then "Sign up" as the button. Both come back to the page.
- Signed in: "Sign out", then "Dashboard" as the button, the customer's account at
  `/account` **(assumed)**. The quiet button comes first and the filled one last in both.
- The booking and account pages keep their own header, with My bookings and Account.

### The footer and the closing call

Superseded on 2026-10-26 by `261026-site-footer.md`: the closing call is gone, the footer
is written in the console, and `COMPANY` is its default content.

- The footer gets the company's details from the WordPress footer, laid out anew: the logo
  and a line about the company; the live locations; the company pages that are published;
  the address, phone, email and WhatsApp; the social links; then the legal name and SSM
  number on the bottom line, centred. The columns close up to the right whichever are
  shown. The details lived in `COMPANY` in `contact.ts`, beside `CONTACT`, until
  261026, when they moved into the editable footer.
- The closing call keeps its line, "Tell us where you want to go.", with two answers:
  "Get my price", which brings the search card into view (or opens the page that has one:
  the location's main page from its blog, the home page from a site page or a paused
  location), and "WhatsApp us". Each page renders its own closing call, as only the page
  knows where its card is.

## Data model

Additions to `packages/db/prisma/schema.prisma`. Columns with defaults and a new table, so
the push loses no data.

```
LocationPage   + slug String @default("")       ("" for a section's own page, else the child's slug)
               + position Int @default(0)       (its place among its section's pages added on demand)
               + firstPublishedAt DateTime?     (set once; the date a post shows, and the slug lock)
               @@unique([locationId, page, slug, locale])   (was [locationId, page, locale])

SitePage       id String @id @default(cuid())
               page String                      ("home" | "about-us" | ...)
               locale String @default("en")
               isOn Boolean @default(false)
               draft Json
               published Json?
               publishedAt DateTime?
               firstPublishedAt DateTime?
               updatedAt DateTime @updatedAt
               @@unique([page, locale])
```

`page` keeps its meaning: "landing" or a section's key. A class page is
`page: "car-with-driver", slug: "sedan"`.

### The activity log

| Action                    | Logged                                                     |
| ------------------------- | ---------------------------------------------------------- |
| `location.page.published` | as today, with the page's `slug`                           |
| `location.page.updated`   | as today (an unpublish), with the page's `slug`            |
| `location.page.created`   | a page added on demand: the section, the slug, the name    |
| `location.page.renamed`   | the slug before and after                                  |
| `location.page.deleted`   | the section, the slug, the name, whether it was public     |
| `location.pages.ordered`  | the section and its slugs in order, before and after       |
| `site.page.published`     | the page and its content before and after, as a location's |
| `site.page.updated`       | the page and whether it is published                       |

A site page logs against the entity type `site-page`, its key as the id.

## Keeping the pages fresh

- Every write on a location's page refreshes `location:<slug>`, as today. Turning a class
  on or off already does, so a class page pauses and resumes with it.
- Site pages are cached under a new tag, `site-pages`, which the home page and the footer
  read too.
- Every new public route with an address part exports `generateStaticParams` returning an
  empty list; the site's documents have none and are static as they are. None reads
  anything from the request (`261007-location-pages-static.md`).
- The customer site's build reads the database: the home page and the documents are
  prerendered. So `pnpm db:push` runs on the development database before this branch is
  built for a Preview or staging, and `pnpm db:push:prod` before the merge.

## Build order

Built in one working tree, to be split into commits by concern for review:

1. This document.
2. The search card: icons, clear buttons, saved addresses on the pick-up, the empty answer.
3. The header, the footer, the closing call and `COMPANY`.
4. Sections: the schema, the section list and kinds, class pages, pages added on demand,
   popular places in place of highlights, the three new services, hero images on cards,
   `db:migrate-popular-places`.
5. The blog: the Markdown renderer and editor, the import, the article checks.
6. Site pages: the table, the Site pages screen, the home page's content, the five
   documents, the footer's links.

What the developer does by hand:

- `pnpm db:push`, then `pnpm --filter @repo/db db:migrate-popular-places`; the same with
  `:prod` before the merge.
- Publish each location's Popular places page and its popular places.
- Put the CEO's text into the legal pages and publish them.

## Questions to re-decide

Answered in the first review (261025): migrated highlights stay drafts; Dashboard opens the
customer's `/account` and the site never links to the console; the company pages get
starting text; no cap on pages; M.I.C.E. waits for the CEO; the instinct additions are kept.

Answered in the second review (261025): the services not bookable yet are published with
their notice; places are one catalogue of three types, a place listed under more than one;
a page under a section waits for the section's own page; the search card is not locked to
the location; the per-page switch for search engines; the Pages layouts and the floating
preview bar above; Website as the sidebar's name; Marketing edits the locations' pages and
SUPER alone the site's.

Answered in the fourth review (261026): a place in two lists is two pages; the console's
addresses above; the list a tree that folds; the tab called SEO.

Open:

1. **Malay pages.** `/ms/` before the same path (`/ms/langkawi/popular-places/…`), English at
   the root, each page linking its other language (`hreflang`); agreed in the third
   review. How the editor holds both, mocked up in the fourth round, to decide later: A, a
   language switch on the editor, each language with its own draft and publish
   (suggested); B, the two side by side with one publish; C, each language a row of its
   own in the list. The rows already carry a locale.
2. **The WordPress blog and guides** at cutover (P3, after the URL inventory O2), with the
   internal teams: a redirect table, an old address and the page it now leads to,
   answered 301 before any page is looked for, so no page stands at the old address. Each
   post's editor can show its old addresses. The same table serves the other WordPress
   pages and a slug changed after its first publish.

## Added on instinct

Kept in the first review:

- The "Updated" date and `Article` structured data on blog posts.
- The image size in the URL fragment, so body images reserve their box.
- The intro and FAQs of the home page as new sections.
- The empty answer of the place search (`emptyHint` on `PlaceInput`).
- The WhatsApp number put in from the WordPress site's link, 012-527 8808, in place of the
  placeholder (OP0-01). The footer's phone and email are the WordPress footer's.
- Three other popular places at the foot of each popular place, and the newest posts on
  the main page.
- The Site pages screen replacing the Home page screen.
- The line about the company in the footer ("Cars with drivers, coaches and whole trips
  across Malaysia, planned by a team based in Langkawi."): new wording, for Marketing to
  confirm with the rest (OP0-18).
- "Last updated" with the publish date on the terms, privacy and refund pages.
- On the preview bar, the pages under the section shown, besides the main page and the
  sections.
- A failed place search no longer reads as "nothing found": the hint shows only for a
  search that answered with no place.

Added in the second round, kept in the second review:

- The footer's WhatsApp line reads "WhatsApp us" instead of repeating the phone number.
- The "Add" dialog's first field takes the editor's own name for it: "Name" for a place,
  "Title" for a post.

Kept in the fourth review (261026):

- Pages across locations has a "Changed" column, when the page last changed.
- In the preview's page picker, Enter opens the first match.
- The preview leaves a dark band at the foot of the page, under the floating bar, so the
  footer is never hidden.
- The menu's support for a row opening in a new tab went with "Open the public page".
- Ctrl or ⌘ and a press on a row opens it in a new tab.
- A document's optional cover, while empty, is a box the size of the picture (16:9).

Added in the fifth round, to re-decide:

- The saved addresses list saves each change at once, as the dialog does from a page,
  where it had a Save button.
- Folded sections stay folded while the console is open in the tab; a reload opens them.
- A section's list shows a place's saved address and a post's first publish as a column.
- The preview's boxes carry no label of their own: their line names the part.
- The home page's empty tagline box is tilted like the handwritten word.

## Future work, on record

- Read a location's page summaries with JSON operators once a location has many posts: the
  view reads every page's content to build its cards today, and Pages across locations
  (`listLocationPages`) every page's draft and public copy, a post's whole text with them,
  to list names and statuses. Found in the PR review (261026).
- A saved address added with its page writes the address, then the page, apart: a slug
  another admin takes in that same moment leaves the address saved without its page while
  the dialog says it failed, and a retry is refused as saved already. One transaction for
  both (`setLocationAddresses` taking a transaction client) closes it. Found in the PR
  review (261026).
- After a save or a publish, the editor takes what it sent as stored, though the writer
  drops a saved address removed meanwhile (`writePageContent`): the editor shows the old
  address as saved until a reload. The action answering with the stored content fixes it.
  Found in the PR review (261026).
- A site-wide `/blog`, `/attractions` and the product hubs.
- Redirects for a renamed slug, at cutover.
- Malay pages, as `261001` records.
