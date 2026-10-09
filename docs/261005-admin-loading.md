# Admin speed: region, the loading line and streamed pages

Decided with the developer on 2026-10-05, after feedback that staff "do not know it is
loading" when they change pages in the admin.

## What was measured

On staging, signed in, three runs a page (2026-10-02 and again 2026-10-05):

- A sidebar click took 1.4 to 3 seconds, a booking 3 to 4.5 seconds.
- During that wait nothing on screen changed: the address, the page and the sidebar all
  stayed as they were.
- Every response carried `x-vercel-id: sin1::iad1`. The request entered Vercel in
  Singapore, but the code ran in Washington DC, Vercel's default region, while the Neon
  database is in Singapore (`ap-southeast-1`). Each query crossed the Pacific and back,
  about 220 ms, and a page runs several one after another.

## What changed

### 1. Functions run in Singapore

`apps/web/vercel.json` and `apps/admin/vercel.json` set `"regions": ["sin1"]`, beside
the database. The same is set in both Vercel projects' settings; the files keep it
reviewed and stop the two from drifting. The Hobby plan allows one region, and it may be
any region.

To check where a deployment runs, read the `x-vercel-id` header of a server-rendered
page: `sin1::sin1::…` is right, `sin1::iad1::…` is the old default.

### 2. The loading line

`NavigationProgress` (in `@repo/ui`, shared with the customer site since 2026-10-09; see
`docs/261009-web-loading.md`) draws a thin line in the logo's navy and blue along the top
of the console while the next page is on its way. The page on screen stays until then.

- It listens for clicks on links at the document, so no link has to report anything and
  a new screen is covered without doing anything.
- It shows only when the wait passes 400 ms. A fast page change shows nothing.
- It stops when the address changes, and gives up after 20 seconds.
- A move made by a form after it saves is not a link click and shows no line; those
  forms show their own "Saving…" state.

### 3. Pages stream

A console page used to wait for all its data and arrive in one piece. Now the page
checks access, renders what it knows at once, and gives the part that waits on the
database to `Streamed` (in `_components/Skeleton.tsx`) with a skeleton of its shape:

```tsx
export default async function BookingsPage() {
  await requireAdmin("bookings.view");
  return (
    <>
      <PageHeader title="Bookings" />
      <Streamed fallback={<TableSkeleton columns={6} />}>
        {() => bookingsList({ filter })}
      </Streamed>
    </>
  );
}

async function bookingsList({ filter }: { filter?: BookingStatus }) {
  const bookings = await listBookings({ status: filter });
  return <BookingsTable bookings={bookings} />;
}
```

Rules for a new page:

- `requireAdmin` stays the first line of the page, before anything is rendered. A
  redirect must happen before the page starts to arrive.
- A page with a fixed title renders its `PageHeader` itself, and only the data is
  streamed. A page titled by its record (a booking, a state, a location) streams the
  header with the record, and its skeleton starts with `HeaderSkeleton`.
- Build the skeleton from the shared shapes: `TableSkeleton`, `CardSkeleton`,
  `RowsSkeleton`, `DetailSkeleton`, `FormSkeleton`. Do not draw a new one per page.
- A list narrowed by the address (`?status=`, `?before=`) gives `Streamed` a `key`, so
  another filter shows the skeleton and not the rows of the one before.
- A page with no data of its own (New booking, Restricted) has nothing to stream.

### The 150 ms grace

React keeps a skeleton it has shown on screen for about 300 ms, so that content does not
flash. A skeleton shown for data that was 20 ms away would therefore make a fast page
slower. `Streamed` holds the page back for up to `GRACE_MS` (150 ms): data that arrives
within it goes out with the heading as one page, with no skeleton. Only data slower
than that leaves the heading and the skeleton on screen.

The cost is the band just past the grace: data that takes 200 ms shows at about 450 ms.
`GRACE_MS` is the one number to tune if staging shows most pages landing in that band.

### A record that does not exist

`notFound()` inside a streamed part runs after the page has started to arrive, so the
response is already `200`. The not-found screen still shows. This is how Next.js streams
and is fine for the admin, which is not indexed.

## Not done

- No cache in the admin. Bookings are live and shared by five people, and every page is
  personal to the signed-in admin. A short browser cache (`staleTimes`) would make a
  return to a page instant, at the price of showing another admin's change up to that
  many seconds late. Measure after the region change before considering it.
- The customer site's pages were not changed, apart from the region.
