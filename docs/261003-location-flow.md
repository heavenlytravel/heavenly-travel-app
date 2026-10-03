# Locations: a simpler flow and the Home page screen

Decided with the developer on 2026-10-03, after the four PRs of
`261001-locations-and-pages.md` were built (#31 to #34). This document revises that plan;
where the two disagree, this one wins, and the PR that builds it edits the earlier
document to match (the sections to touch are listed at the end). One PR,
`feat(admin): simpler location flow`, built in its own thread after #34 merges.

## Why

Taking a location live today takes ten steps, and three of them mean nothing to the
Marketing admin: switching each page on after publishing it, and moving the location to
`preview` before it can go live. The state, the page status and the On switch are three
separate ideas on one screen, and the screen also carries two things that are not about
this location: the home page's top choices, and a Pickups card that repeats what the
district list already says.

Taking Langkawi live, from the Marketing admin's point of view:

| #   | Today                                                       | After this plan                                         |
| --- | ----------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Add location: name, slug, Kedah, Langkawi, tagline          | Same                                                    |
| 2   | Add saved addresses (highlights need them; nothing says so) | Same; the editor says so where a highlight asks for one |
| 3   | Edit Landing, fill everything, Publish                      | Same                                                    |
| 4   | Back, switch Landing on                                     | Gone: a published page is public, there is no switch    |
| 5   | Edit Car with driver, fill, Publish                         | Optional: the landing page alone can go live            |
| 6   | Back, switch Car with driver on                             | Gone                                                    |
| 7   | "Move to preview"                                           | Gone: the Preview link works in every state already     |
| 8   | Open Preview, check                                         | Same                                                    |
| 9   | "Go live", confirm                                          | Same                                                    |
| 10  | Home page card on the location screen: add as top choice    | On the Home page screen                                 |

## Decisions

### Three states

`preview` goes. The states are `draft`, `live` and `paused`; no Prisma enum, as before.

| State    | The public sees                               | Moves to |
| -------- | --------------------------------------------- | -------- |
| `draft`  | 404. Staff see the drafts on the preview page | `live`   |
| `live`   | The pages                                     | `paused` |
| `paused` | The pages, with a notice in place of the card | `live`   |

- "Go live" from `draft` checks two things: the landing page is published, and no
  published page has edits waiting. A product page is not needed (revised on review, the
  same day): a landing page with no product page published shows no product links and
  still carries the search card, so the location sells both products either way. Nothing
  else changes about going live: the slug locks, the confirmation asks, the move is
  logged.
- Resuming a paused location still checks nothing. A location that has been live never
  returns to `draft`.
- The code already reads a state it does not know as `draft`. Before the PR merges, no
  location may be in `preview` in either database: the Locations list shows the state,
  so move any such location to `live` or back to `draft` first. No script is needed.
- The preview page is unchanged. It shows the drafts in every state, and its bar still
  names the state and the page's status.

### Published means public: no switch

Revised on review, the same day. The plan first kept the On switch and had a page's
first publish flip it. Built, that left two controls with nearly the same states, a
"Published, off" status, and a Publish that changed nothing in public for a page that
was off. So the switch is gone and a page has one status.

| Status                   | The public sees (location live or paused)    | The preview shows |
| ------------------------ | -------------------------------------------- | ----------------- |
| Not published            | Nothing: a product page sends to the landing | The draft         |
| Published                | The page, as drafted                         | The draft         |
| Published, edits waiting | The copy last published                      | The newer draft   |

- "Publish" makes the draft the page's public copy. A published page is public once the
  location is `live` or `paused`; in a `draft` location nothing is public yet.
- "Unpublish" takes the page from the public and keeps its draft. The page reads "Not
  published" again, and "Publish" brings it back. It is in the page's editor, shown once
  the page is published.
- The landing page cannot be unpublished once the location has left `draft`, since the
  location's address must not become a 404: pause the location instead.
- On a location that is `live` or `paused` both ask first: "Publish? This goes public at
  once." and "Unpublish the Coach charter page? Visitors to it are sent to the
  location's landing page." A draft location's page does both without a question.
- Under the status the editor says what the public sees: "The public still sees the copy
  published 3 Oct 2026. Publish to replace it."
- Data: no schema change. `LocationPage.isOn` now says whether the page is published:
  true from a publish until the page is unpublished. `published` keeps the copy last
  published either way, so the next publish's history entry can show what changed.
- The log: a publish is one entry. An unpublish is `location.page.updated` with `isOn`
  false, read as "Unpublished the Coach charter page". Entries from before, of a page
  being turned on, keep their sentence.

One page of a live location, where v1, v2 and v3 are versions of its text:

| #   | The admin does        | Status                   | The public sees | The preview shows |
| --- | --------------------- | ------------------------ | --------------- | ----------------- |
| 1   | Writes v1, Save draft | Not published            | Nothing         | v1                |
| 2   | Publish               | Published                | v1              | v1                |
| 3   | Edits to v2, Save     | Published, edits waiting | v1              | v2                |
| 4   | Publish               | Published                | v2              | v2                |
| 5   | Unpublish             | Not published            | Nothing         | v2                |
| 6   | Edits to v3, Save     | Not published            | Nothing         | v3                |
| 7   | Publish               | Published                | v3              | v3                |

### The location screen

- The header carries the state badge beside the name, and the state's move ("Go live",
  "Pause", "Resume") beside "Preview". The State card goes. While the move is blocked,
  its button is disabled and one line under the header says what to do first, the same
  sentences `stateMoveBlockers` gives today.
- The Details card shows the ticked districts as a list, each with the dot of the
  district picker (below), and an "Edit districts" button that opens the picker in
  place. The Pickups card goes.
- The Home page card goes (see below). The Pages, Saved addresses and History cards stay.
- The Pages card shows each page's status, "Not published", "Published" or "Published,
  edits waiting", and "Edit". It has no switch.

### The district picker

- A dot beside each district's name says whether Operation serves pickups there: filled
  green for on, a grey ring for off. The words are not repeated per district (revised on
  review: a state such as Selangor filled the picker with "Pickups on"), and there is no
  legend on the screen: the info tooltip beside "States" and beside "Districts" says
  what the two dots mean, and each dot names itself on hover. The add form and the
  Details card use the same picker, and the Details list uses the same dots.

### Saved addresses lie in the location

- A saved address has to be in one of the districts ticked for the location, placed by
  its coordinates as a pickup is (`districtCodeAt`). Added on review: Langkawi could be
  given addresses anywhere in Malaysia.
- Saving the list refuses every new address that is outside, in one message that says
  where each lies: "Petronas Towers is in Kuala Lumpur, Kuala Lumpur. A saved address
  has to be in one of the location's districts."
- The districts cannot be changed so that a stored address is left outside them: the
  admin removes the address first, or keeps its district ticked.
- An address stored before the rule that lies outside is not removed. The list marks it
  "Outside this location's districts", and it can still be renamed, moved and removed.
- The search itself is not narrowed: it offers any exact place in Malaysia, and the rule
  is applied on Save. Narrowing the suggestions to the districts is future work.

### The Home page screen

- A new screen, `/home-page`, under Marketing in the sidebar, behind `locations.manage`.
  It holds the top choices: the three slots in order, each with the location's name,
  tagline and state; move up, move down, remove; and "Add" from the live locations not
  yet chosen. The rules are unchanged: live only to add, a paused one keeps its place and
  is left off the home page, at most `TOP_CHOICE_CAP`.
- `TopChoiceControl` moves there and takes the whole list rather than one location's
  place in it. `changeTopChoice` in `@repo/db` is unchanged. The Locations list keeps its
  "Top choice" column.
- Anything else the home page may one day need from Marketing lives on this screen.

### The editor

- Where a highlight asks for a saved address and the location has none, the editor says
  "Add saved addresses on the location first", with a link. Today the control is
  disabled and silent.
- The editor has "Save draft", "Publish" and, once the page is published, "Unpublish".
- The editor's preview link reads "Preview", as on the location's screen. It still opens
  the saved draft.

### Delete

Decided on 2026-10-03, after the flow above merged (#35), and built as its own PR,
`feat(admin): delete a location`. The first decision was to delete only a location
that had never been live; on review the same day it became any location, behind a
stronger gate once the location has been live.

- Any location can be deleted, with its pages and its saved addresses.
- One that has never been live (`wentLiveAt` is null) goes on a plain question: "Delete
  Langkawi? Its pages and saved addresses are deleted with it. This cannot be undone."
  Nothing of it was public. It is how a test or a mistaken draft is cleared.
- One that has been live has a public address, and the delete turns it into a 404. So
  the card says what that costs, and the button works only once the admin has typed the
  location's slug. The server checks the typed slug again.
- What it costs, as the card says it:
  - Every link and shared address to the location breaks.
  - Search engines drop a page that answers 404. Adding the location again at the same
    address starts its ranking almost from nothing.
  - A paused location keeps answering with its content, so it stays listed however
    long it is paused. Pausing is the way to stop selling a place for a while.
- The slug stays locked once the location has been live; there is no rename. A wrong
  slug is put right by deleting the location and adding it again, at the cost above. A
  rename that forwards the old address was considered and set aside: the delete covers
  the case, which is expected within days of going live, when little is lost.
- A draft is never listed by a search engine: it is a 404 to the public, and the
  preview is for staff and marked not to be indexed. The card says so: to try something
  out, keep the location in draft and use Preview.
- A top choice leaves the home page with the delete, and the places after it close up.
- The customer site is refreshed: the location's pages become a 404 and its card leaves
  the home page.
- "Delete" is a card at the foot of the location's screen. A deleted location opens the
  list.
- The log: one entry, `location.deleted`, holding the name, the slug, the district
  codes and the state the location had. Its earlier entries stay. The Activity screen
  names them "Langkawi (deleted)", from that entry, and no longer links them to a page.
- The images its pages uploaded stay in UploadThing, as replaced images do.
- Until the site is opened to search engines at cutover, a delete costs links only.

## As built

Choices made while the PR was built, where the decisions above left room or where
following them to the letter would have told the admin something untrue:

- What blocks "Go live" is one of two sentences: "Publish the landing page", or "Publish
  the changes on the Coach charter page" for each published page with edits waiting.
- For the landing page of a location that is public, "Unpublish" is shown disabled with
  the reason under it, in place of an error after the click.
- Each state has exactly one move, so the code keeps one move per state
  (`LOCATION_STATE_MOVE`) and one button label per state (`LOCATION_MOVE_LABELS`).
- "Edit districts" has a "Cancel" beside the open picker, which puts the stored
  districts back.
- A record's history is ordered by time and then by entry id, so entries written by one
  transaction keep their order.
- History entries written before this PR that name the `preview` state keep their
  sentences ("Moved to preview", "Moved back to draft").

## Not in this PR, on record

- `retired`, for a location that has been live and must go without losing its
  ranking: a permanent redirect, with the redirect table at cutover. Renaming a live
  slug with the old address forwarded waits for the same table.
- Caching the location pages as static HTML. They read no session, so it is possible,
  and it would help the latency of functions in `iad1` reading Neon in Singapore. The
  data cache and the refresh route stay as they are either way.
- The addresses stay at the root (`/penang`), not under a prefix such as
  `/destinations/penang`. Considered on 2026-10-02: the reserved slug list already keeps
  a location off the site's own paths, and the shorter address is what
  `04-location-and-seo-architecture.md` chose.

## What the PR edits in `261001-locations-and-pages.md`

- "States": the table and the bullets, to three states and the moves above.
- "The pages of a location": published and unpublished in place of the On switch.
- "Editing: one draft, then Publish": the question on a public location.
- "The preview page": drop the sentence about the `preview` state; the page is unchanged.
- "The home page": the top choices are set on the Home page screen.
- "The admin screens": the location screen and the new screen, and the picker.
- "Data model": `state` is `"draft" | "live" | "paused"`.
- "Module changes": `location-input.ts` (states, moves, the publish-and-switch rule),
  `locations.ts` (`publishLocationPage` flips the switch), `nav.ts` and the new route.
- "Build order": a fifth row for this PR.
