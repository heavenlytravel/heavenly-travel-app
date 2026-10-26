# The services' hubs, and the home page's services

Status: asked for and decided with the user on 2026-10-26, built the same day on
`feat/site-footer`, in the same PR as the footer.

A customer could reach a service only through a location: `/langkawi/car-with-driver`.
Nothing said which places offer it, and the home page went from the search card straight
to "Choose your destination".

## Decisions

- **Two hubs**: `/car-with-driver` and `/coach-charter`, one per service that can be
  booked. Their keys are the locations' section names.
- **A hub is a site page**, written in the console under Pages > Website like About us
  and Terms (`website.manage`), with draft, preview at `/preview/car-with-driver`, publish
  and history. Its kind is `service`, as a location's service page: a hero (headline,
  subheadline, image), an intro and FAQs, and the same checks before a publish.
- **Public from the start**, as the home page is. Until it is first published, a hub
  shows built-in words and a brand photo (`HUB_DEFAULTS`: `chauffeur.jpg`, `coach.jpg`).
  Like the home page, it stays published once published (`hasBuiltInCopy`), and its
  editor says the public sees the built-in words until then.
- **Which locations it lists**: those the public sees (live or paused, main page
  published) whose own page of the service is published. That is the rule the
  location's own site follows. So if Penang's coach charter page is not published,
  Penang is not on `/coach-charter`. A card shows the location's name, the service page's
  subheadline (else the location's tagline) and its hero image (else the main page's).
  It opens `/penang/coach-charter`. Top choices come first in their order, then the
  others by name. With none, the hub says the service is coming to more places, and a
  preview says which page to publish.
- **The home page** gains "Our services" between the trust strip and "Choose your
  destination": a photo card per hub, in the destinations' style, with its published hero
  image or its built-in photo, and the section's one-line note.
- The hubs' addresses join the reserved slugs, so no location can take them.

## The header

Asked for on 2026-10-26 with the hubs: one header for every page of the customer site,
in place of the two there were (the marketing pages' and the booking and account
pages'). Sign-in and sign-up keep their own frame.

- From `lg` up: the logo, then Car with driver and Coach charter (the hubs) and
  Destinations, a menu of the home page's top choices and "All destinations", which goes
  to "Choose your destination" on the home page. On the right, signed out, "Sign in" and
  "Sign up"; signed in, "My bookings" and the account's menu.
- Below `lg`, a menu button opens a panel with the same links. On a phone only the
  filled button stays in the bar.
- It stays at the top as the page scrolls, white with a hairline and a soft shadow. On
  the home page it is clear over the hero until the page scrolls. A jump to a part of a
  page lands clear of it (`scroll-padding-top`).

## How it is built

- `site-page-input.ts`: `HUB_PAGES`, their labels, `sitePageKindOf` (`service`),
  `hasBuiltInCopy` and the unpublish rule.
- `listServiceLocationCards(section)` in `location-pages.ts` reads the cards. The site
  caches it under the `top-choices` tag, which every change to a location's pages
  already refreshes.
- Web:
  - `_site/HubView.tsx` (the page, `HUB_DEFAULTS`, `hubCards`);
  - `_site/SiteHubPage.tsx`;
  - the routes under `(marketing)`;
  - `PhotoCards`, shared by the services and the destinations;
  - `HomeCrumbs`, shared with the documents.

## Future work

- Car rental, attractions and hotels get hubs when they can be booked.
- A hub has no search card. A customer picks a location first, whose service page has
  one.
