# Landing sections: home and service hubs

2026-11-14. Built on `fix/web-trips-sheet-scroll`, after the search card (PR #78).

The home page and the two service hubs (`/car-with-driver`, `/coach-charter`) get more
sections, each written in Manage on the page's own editor. The reference is a chauffeur
company's site; we take its kinds of section, not its look or words. Today the home page
shows a fixed "why us" strip, the two hubs as Our Services, and the top destinations; a hub
shows its locations. Only the hero, the intro and the FAQs are written in Manage.

## Decisions

### Sections live in the page's content

- A page's content (`PageContent`, `packages/db/src/page-content.ts`) gains `sections`, on
  the kinds `home` and `service` only (`PAGE_KIND_RULES[kind].sections`). No new table, no
  `db:push`: the draft, the publish, Compare, the history and the preview work as they do.
- `sections` is a list in the page's order. Each has a `type`, an `on` switch, its heading
  (eyebrow, title, a lead line) and what its type holds. A type appears at most once on a
  page. Marketing moves them up and down and switches each on or off.
- The hero with the search card stays first, and the intro and the FAQs stay last: they are
  not sections.
- A stored page with no `sections` (every page today) reads as the page's built-in
  sections, which show what the page shows today. So nothing changes on the site until
  Marketing publishes.
- A section switched on but empty is hidden on the site and marked in the preview, as an
  empty part is today. It does not block a publish. What a filled item lacks does (a logo
  without its name, a quote without its name), listed in the publish dialog under
  "Sections".
- Every image in a section counts as used on the Media screen (`pageImageUrls`), so
  "Delete unused" never takes one a section shows.

### The section types

| Type            | On   | Holds                                                                                  | Read live          |
| --------------- | ---- | -------------------------------------------------------------------------------------- | ------------------ |
| Why Us          | both | 3 to 6 points: an icon from a fixed set, a title, a line. The home strip becomes this. |                    |
| Trusted By      | both | Up to 16 client logos: the image, the client's name (its alt text), an optional link.  |                    |
| Our Services    | home | Up to 6 cards: photo, title, a line, a button (optional), where it leads.              |                    |
| Vehicle Options | both | Which classes, in order; home may mix both services.                                   | Classes, from data |
| How It Works    | hub  | 3 or 4 steps: a title and a line each.                                                 |                    |
| Destinations    | home | Nothing new: the top choices, picked as today.                                         | Top choices        |
| Locations       | hub  | Nothing new: the locations offering the service, as today.                             | Locations          |
| Testimonials    | both | Up to 12 quotes: the words, the client's name, a line under it, an optional photo.     |                    |
| Latest News     | both | How many posts, 3 by default: the newest published blog posts.                         | Blog posts         |

- **Built-in order, home:** Why Us, Our Services, Vehicle Options, Destinations, Trusted
  By, Testimonials, Latest News. Why Us, Our Services and Destinations start on, filled
  as today; the rest start off and empty.
- **Built-in order, hub:** Why Us, Vehicle Options, How It Works, Locations, Trusted By,
  Testimonials, Latest News. Locations starts on; the rest start off.
- **Vehicle Options** shows a class's cover photo, name, seats and luggage from the
  catalogue, so it never goes stale. A class taken off the catalogue drops out of the
  section by itself. It has no button: a class's page is a location's, and the search
  card is above it already.
- **Testimonials** show no stars and no review markup for search engines: Google does not
  show reviews a business writes about itself, and stars we cannot back are a risk.
- **Latest News** with no published post is hidden.
- **Counts and titles before a publish.** A Why Us switched on with any point needs at
  least 3, How It Works at least 3 steps. Every section switched on needs its title, but
  the home page's Why Us strip, which has never had a heading. A card's button is
  optional: without words it shows the arrow the home page's cards have always had,
  which is how the built-in cards stay as today.

### Where a service card leads

A card's link is picked from a list, never typed, so it always leads to a page that
exists:

- the search card, set to a service and a kind of trip: "Car with Driver, Transfer",
  "Car with Driver, By the Hour", "Coach Charter, Transfer", "Coach Charter, By the Hour";
- a service hub;
- a location's main page (a live location's);
- a blog post (a published one).

A search card link opens the service's hub with its search card set to the kind of trip,
from any page: one address, `/car-with-driver?trip=hourly#booking`
(`searchCardPath`), which the card reads once and drops, as a "Take Me Here" link is read
today (`useLinkSeed`). The hub then tells the visitor about the service under the card. A
card whose page went away (a location no longer live, a post unpublished) is hidden on
the site and marked in the editor and the preview.

Built-in cards are the two hubs, as today. A card without its own photo shows the photo
of the page it leads to.

The footer's links are the same kind of link, limited to a site page, a location and a
web address (`site-link.ts`, moved out of `footer-content.ts`).

### A hub is its own kind of page

A hub was a `service` page, as a location's own page of the service is. It is now a
`hub`: the same parts and checks, plus sections, which a location's service page does
not have. The kind is not stored, so nothing in the database changes.

### The editor

- A third card on the page editor, **Sections**, between Page Content and SEO, on the home
  page and the hubs. One row per section: its name, a switch, Up and Down, and an Edit
  that unfolds its fields in place (the open-in-place rule of Manage's redesign).
- Lists inside a section (logos, cards, quotes, steps, points) use the FAQ's controls:
  Up, Down, Remove, and "Add …" under the list, with each list's limit.
- Field limits are shown and checked as everywhere else (`Counted`).
- **Copy from another page.** Trusted By and Testimonials are kept per page, so a hub can
  show only its own clients. Their section has "Copy from…", listing the other pages
  that have the same section filled (home, the other hub; draft copy). Picking one adds
  its logos or quotes to this page's list, skipping any already there (same image, or
  same name and words), up to the list's limit. It is a copy: editing it later changes
  this page only. Asked for by the Tech Lead, 2026-11-14.

## Build order

1. `packages/db`: the section types, reader, limits, checks, built-in sections, image
   urls, `changedPageParts`; tests.
2. Manage: the Sections card, its section editors, the link picker (a server read of the
   live locations and published posts), Compare.
3. Web: each section's view, the home page and hubs rendered from `sections`, the
   preview marks, the search card's `trip` address.
4. Lint, types, tests; a browser pass of home and both hubs on a phone and a computer,
   draft and published.

## Future work, on record

- One list of testimonials and logos for the whole site, picked per page, if copying
  between pages proves a chore.
- A location's main page with the same sections.
