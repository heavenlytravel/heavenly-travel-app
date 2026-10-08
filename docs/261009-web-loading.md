# Customer site: the loading line and pending buttons

Built on 2026-10-09, after the developer noted that the admin got its loading line in
`docs/261005-admin-loading.md` and the customer site never did.

## What was wrong

The site had no loading signal of any kind. The two places a customer waits longest gave
nothing back:

- The search card's button. The options page resolves both places with Google and prices
  every class before anything renders. `useTripSubmit` already knew it was pending, but
  the card threw that away.
- Continue on the options page. A plain GET form, so a full document load, and the confirm
  page resolves the trip again before it renders.

Besides those, Update prices in the trip bar left the old prices clickable while the new
ones were on their way, the confirm page's Change link was a plain anchor that reloaded
the site, and the header's links showed nothing until the next page arrived.

## What changed

### The line is shared

`NavigationProgress` moved from the admin into `@repo/ui` (`navigation-progress.tsx`,
styles in `styles.css`). It takes a `className` for where it sits and a `gradient` of two
colours. The admin keeps it inside its sticky header in navy and blue; the site mounts it
once in the root layout, fixed to the top of the window, in the brand green and gold.

The rules are the admin's: it listens for link clicks at the document, shows only when
the wait passes 400 ms, stops when the address changes, and gives up after 20 seconds.
The site's location pages and home page are static, so a click between them never
reaches 400 ms and shows nothing.

`@repo/ui` now lists `next` as a peer dependency, for the two router hooks the line reads.

### Forms say so on their button

A move made by a form is not a link click, so a form shows its own state. `Pending` (in
`(site)/_components/Page.tsx`) is the one way to write it: a turning `SpinnerIcon` from
`@repo/ui/icons` and what the button is doing. Every pending button on the site uses it:

| Button                       | Pending text            |
| ---------------------------- | ----------------------- |
| Search card                  | Finding prices…         |
| Continue on the options page | Preparing your booking… |
| Edit in the trip bar         | Updating prices…        |
| Confirm booking              | Booking…                |
| Yes, cancel this booking     | Cancelling…             |

`useNavigate` (in `_lib`) is how a form opens a page: a `router.push` inside a transition,
so `pending` stays true until the next page is on screen. `useTripSubmit` goes through it,
and Continue now does too: the form still carries `method="get"` and its action for a
click before hydration, but a hydrated click builds the same URL from the form and pushes
it, so the shell is not reloaded.

### Old prices cannot be chosen

`TripBar` takes the options form as its children and, while the new trip is being priced,
renders them `inert` and dimmed. The bar's own button says "Updating prices…" as before.

### Change is a link

The confirm page's Change goes through `Link`, so it is a client navigation covered by
the line, instead of a reload.

## Not done

- No streaming or skeletons on the site. Each page is one query after the session check;
  the line covers it.
- The place input shows nothing while suggestions are fetched. Add a "Searching…" row
  only if it is noticed on a slow connection.
