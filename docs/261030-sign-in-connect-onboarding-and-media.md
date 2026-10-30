# Our own sign-in, Connect's onboarding, team access and Media

Status: built on 2026-10-31 in one PR off `main` (`feat/auth-connect-onboarding`),
committed by concern. Decided with the user on 2026-10-30, the last round on 2026-10-31
(see "Changed while building"). The mock-ups are HTML outside the
repo, in the agent's `review-shots/mock-connect-2610/` (`index.html` round one, `v2-body.html`
round two, PNGs in `shots/`).

This takes these STATUS rows: BL-111 (our own sign-in screens), BL-112 (Connect's landing
page and one registration form), BL-113 (Connect on the shared tokens) and BL-84 (choose an
image already stored). It adds the access changes the SEO team's first look on staging
showed, on 2026-10-30.

## What the SEO team saw on staging (2026-10-30)

Signed in as `claude_seo+clerk_test@example.com` (REGULAR, team SEO, the wall on):

- The menu: Dashboard, Pages, Media, Settings, and Activity under a location. Every other
  screen answers "This Screen Belongs to Another Team". Correct.
- **The Dashboard is Operation's**: pick-ups today, received, awaiting a driver, documents
  due. Nothing on it is SEO's work.
- **A location's Activity shows everything**: rate grid changes, zones, surcharges and other
  staff members' emails. Its key is `locations.view`, which every admin holds.
- **Media shows the fleet's photos** with their delete boxes live. Today `media.manage`
  deletes any file not on a page, vehicle and class photos included, after "delete" is
  typed.
- Settings shows the locations with booking counts, and a location's status. Nothing there
  is SEO's.
- Pages works, and is what SEO needs.

## Decisions

### 1. Accounts are made two ways, never with a password set for someone

- **Customers** (`/~/team/customers`, `users.manage`): "Create an account" keeps its fields
  and gains a **Make staff** part, the level and the teams, off by default. On, the account
  is made and promoted in one go.
- **Staff** (`/~/team`, `admins.manage`): "Add staff" takes an email, the names, the level and
  the teams. An email with an account is promoted (its names are left as they are); one
  without gets an account first, as Customers makes it. One sheet, one server action, the
  same `createUser` underneath.
- An account made for someone has its email verified and no password. They sign in with a
  code to that email, and may add a password themselves from the account window.
- **Later, kept in mind:** an optional welcome email ("your account is ready, sign in at …").

### 2. Each team sees its own work

- **Dashboard**: `dashboard.view` moves from every admin to the booking teams (Operation,
  Reservation, Sales, Finance). An admin without it lands on the first page of the menu it
  holds: Pages for Marketing and SEO.
- **Settings**: shown to an admin who holds a key of one of its cards (a location's details,
  its coverage, the safety buffer, its status for `SUPER`). SEO holds none, so it has no
  Settings.
- **Activity, by area**: each logged action belongs to one area, and each area to the key
  that works it. An admin sees the entries of the areas it holds, everywhere: the global
  `/~/activity` opens to every admin, filtered, and `SUPER` sees all of it. The filter chips
  show only the areas held. SEO sees Pages and Website.

  | Area                                      | Key                |
  | ----------------------------------------- | ------------------ |
  | A location's pages, images, publishing    | `pages.manage`     |
  | The website's pages, footer, top choices  | `website.manage`   |
  | A location's details and saved addresses  | `locations.manage` |
  | Classes, coverage, zones, rates, rules    | `coverage.view`    |
  | Vendors, vehicles, drivers                | `fleet.manage`     |
  | Bookings, trips, notes                    | `bookings.view`    |
  | Status: live, paused, added               | `locations.view`   |
  | Team, accounts, the wall, a contact shown | `SUPER` only       |

- **Media, by owner**: a file is the pages' or the fleet's, by where it is used now or in a
  page's history. `pages.manage` and `website.manage` see the pages' files; `fleet.manage`
  sees the fleet's (vehicle photos, class pictures); a file used by both shows to both. A
  file used nowhere shows to anyone with Media. Deleting follows what is seen.

### 3. Media

- **An image in use is never deleted from Media**, a vehicle's photo and a class picture
  included, as a page's image already is. Its card lists every place it is used, each a
  link to that page, vehicle or class, where it is changed. Once nothing uses it, Media
  deletes it. No Replace from Media: swapping an image under a published page without a
  publish, and around the pages' history, is more risk than it saves (the user, 2026-10-30).
- **Grid or table**, a switch on the screen, remembered. The table lists the name, size,
  date, status and every place the file is used, each a link to that page, vehicle or
  class.
- **Choose from Media** in every image field: beside "Upload", a picker over the files the
  admin may see, so one picture serves several places without a second upload (BL-84). A
  vehicle's photos list may pick several.
- **Every image field**: the Remove button takes the danger colour, and a **View** button
  opens the image full screen.

### 4. Connect: landing page, registration, status

- **The landing page is at `/` for a visitor signed out**; signed in, `/` is Connect as
  today. Round two of the mock-up (`v2-landing`), on the Signature look: the product in a
  phone as the hero, an "Open now" board of locations and services, one job from the offer
  to the drop-off with the real screens, a fleet or one car, what to have ready, what each
  side owes, questions. It says nothing we cannot stand by: no partner counts, no payout
  days.
- **Not indexed until the cutover** (`noindex`), but **editable now**, in the same page
  editor as the website's pages (`website.manage`: Marketing, SEO, `SUPER`): a site page
  `connect` of a new kind with its own sections (the hero, the job's four steps, what to
  have at hand, what each side owes, the questions, the closing). The "Open now" board is
  read from the locations and is not written. Its built-in words are round two's, and it is
  filled and published on development as soon as it is built. Preview on Connect's
  `/preview`. No schema change: one more `SitePage` row.
- **Pages, in three parts** under `~`, each named with its address: **Website**
  (heavenlytravel.my: home, the services' hubs, about, contact, the legal pages, the
  footer), **Connect** (connect.heavenlytravel.my: its landing page) and **Locations** (each
  location's pages, as today under its slug).
- **Registration is the whole form first, at `/register`** (`/join` and `/sign-up`
  redirect there): you (names, email, WhatsApp), the business (company or one person,
  name, SSM or IC, address), what you run and where, and a password. The form is kept in
  the tab's storage, so a reload loses nothing. The fields are checked before the account
  is made, so a mistake shows at its field while nothing is stored.
- **The words**: the form's button is "Send my registration", with "We'll set up your
  account with this email and send a code to confirm it." over it. The dialog for an email
  with an account: "This email already has an account", the code (or its password), and
  "Confirm and send". No "sign in" in the words.
- **Sending it starts the sign-up**: Clerk makes the sign-up with the email, the names and
  the password, with its bot check, and emails a code. The code confirms the
  email and makes the account; the session starts and the registration is sent with it.
  Nothing is stored before the code.
- **An email that already has an account** (Clerk refuses the sign-up as taken): the
  password typed is tried first; if it is not the account's, the dialog asks for it, or
  sends a code, and a new browser's check (Device Trust) when Clerk asks. The registration
  is sent once signed in.
- **An account that already registered a business** is not sent a second one: once
  signed in, a pending one goes straight to its status page and an approved one straight to
  Connect's dashboard; refused or suspended, to its screen. A signed-in visitor who opens
  `/join` goes the same way. An account that drives for a vendor is refused, as today.
- **Addresses**: `/register` is the one way in (round two dropped `/join` and
  `/sign-up`).
- **Status is a page, not Connect** (S1): `/` shows a pending vendor's owner the tracker
  (sent, being checked, Connect opens), what was sent, and how to reach the team. Nothing
  of Connect opens before the approval. Refused and suspended keep their screens, redone
  in the same look.

### 5. Our own sign-in, now, in all three apps

- **One package, `@repo/auth`** (source only, like `@repo/console`): the screens on Clerk's
  hooks (`useSignIn`, `useSignUp`, signals API of `@clerk/nextjs` 7), each app passing its
  words and links. The account window and the user menu stay Clerk's.
- **Which portal**: every screen names where it signs in, "Heavenly Travel", "Manage" or
  "Connect", though the session is shared.
- **Password first, the code as the other way** (the CEO's preference): sign-up asks for a
  password and says a code to the email works too. Sign in: email, then the password when
  the account has one, with "Email me a code instead"; an account without one (made by
  staff) gets the code, and may add a password from the account window. Forgot password: a code, then the new password, with
  "Sign out of other devices". A password found in a leak asks for a new one. Every Clerk
  status is handled: `needs_first_factor`, `needs_second_factor`, `needs_client_trust`
  (the new device's code), `needs_new_password`, `complete`.
- **Sign up** (the website only; Connect signs up through `/join`): names, email, the
  password, the code. The `?email=` of a guest's booking email still fills it.
- **Errors at the field**: no account with that email (each app says what to do), a wrong
  or expired code, too many tries (the lockout's wait), the bot check failing, the network.
  Resend has a cool-down.
- **The look**: the shared tokens; navy page on manage and Connect, the light page on the
  website, as `AuthShell` does today.

### 6. Connect on the shared tokens

Every Connect screen is restyled, not reflowed: its colours, type and parts come from
`shared-styles.css` and `@repo/console` like the other two apps, and it drops its 177
Tailwind palette classes. It names itself `data-app="console"` for the console's shape.
The navy band becomes the shared Signature band, the same as manage's dashboard hero. Its
own CSS keeps only motion (the rising card, the live ping).

## Changed while building (2026-10-31)

- **Password first, at sign-up and sign-in** (the CEO's preference): Clerk's "password
  required" stays on; the code is the other way. "Forgot password?" offers a reset by
  code or a code to sign in now.
- **The user menu and the account window are ours too**: `AccountMenu` and
  `AccountSettings` in `@repo/auth`, at `/account` on the website and Connect and
  `/~/account` in manage. The name; the email, changed by a code sent to the new one; the
  password, added or changed; the devices signed in, each to sign out. A change Clerk
  counts as sensitive asks the person to confirm it is them in our own dialog
  (`useReverification`). A sign-in by code to an account with no password lands on its
  account page with the offer of one; "Not now" goes on.
- **No Replace in Media**: changing an image under a published page without a publish,
  and around the pages' history, was more risk than it saved. An image in use links to
  the places it is used instead.
- **Connect's landing page is editable now**, not after the cutover: a site page of the
  kind `connect` (`CONNECT_PAGE`), in Pages under a part of its own, at
  `/~/pages/connect`, opening on its built-in words (`CONNECT_PAGE_COPY`). Its text's
  `##` parts lay out as cards; the steps, the two kinds of vendor and the "Open now"
  board (`listVendorOpenings`, from the live locations) are drawn by Connect. It was
  published on the development database on 2026-10-31; production shows the built-in
  words until someone publishes it there.
- **Pages in three parts**: Website, Connect, then each location.
- **Operation holds Media** (`media.manage`), for the fleet's photos its scope shows.
- **Activity's areas**: top choices log their own action (`location.top-choice.updated`)
  so they file under the website; the per-location history kinds are gone. Status
  entries are `locations.view`'s, which every admin holds, so SEO sees Pages, Website and
  Status.
- `bg-band` moved into the shared tokens; manage's dashboard and every Connect screen use
  it.

### Round two, after the user's review (2026-10-31)

- **Connect's screens moved under `/~`**, as manage's are: `/~` is the home (jobs),
  then `/~/jobs/…`, `/~/vehicles`, `/~/drivers`, `/~/staff` and `/~/account`. `/` is
  the landing page for everyone; signed in, its header offers "Open Connect" in place of
  "Sign in" and "Register". A scope by location could take the `~`'s place later. A
  sign-in lands on `/~`, the app's start (`start_url`) is `/~`, and the approval
  email's "Open Connect" opens `/~`.
- **The status page is `/status`**: a pending vendor sent to `/~` or `/register` goes
  there, and anyone else who opens it goes to `/~`.
- **No `/join` or `/sign-up` in Connect**: neither was ever linked from production
  (`/join` never reached `main`), so they were removed rather than kept as redirects.
  Connect's `NEXT_PUBLIC_CLERK_SIGN_UP_URL` is `/register`, and it no longer reads
  `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`.
- **The registration keeps the person on the account**: the phone typed goes to the
  account's `phone` (as a booking's does), and the names to Clerk when the account
  has none (`keepApplicantProfile`). The field is "Phone number", the WhatsApp.
- **The code is six boxes**: one real input over them, so typing, pasting and the phone's
  fill from the email work as in any field.
- **No account with the email** reads as Clerk says it, "Couldn't find your account.";
  the website and Connect add their way on (sign up, register), manage nothing.
- **A sign-in or sign-up leaves by a whole page load**, not a client navigation: every
  server component reads the new session, and React's timings in development no longer
  throw "cannot have a negative time stamp" when the page they land on redirects.
- **Connect**: the logo stands alone, without the "Connect" chip; the landing page's links
  to its parts scroll smoothly; the loading skeleton is `/~`'s only, so the landing,
  `/register` and `/status` no longer flash the dashboard's; `/register` signed out has
  no account circle.
- **The website's sign-up stays names, email and password**: the phone is asked at a
  booking's confirm step, which keeps it on the account.

## Outside the code (the developer, in Clerk's dashboard, both instances)

- **Password at sign-up** stays required, as the development instance has it.
- **Device Trust** (Protect, Rules): it asks for a code when someone signs in with a password
  on a browser Clerk hasn't seen, once per browser. A code sign-in never meets it. The user
  decides later; the screens handle it either way.
- Check that production matches development: email code as a first factor, the bot check on,
  the lockout (10 tries, 60 minutes).

## Commits, in order

1. `@repo/auth`: sign-in, sign-up, the user menu and the account window on Clerk's hooks.
2. Team: Create with Make staff, Add staff that creates.
3. Access: Dashboard and Settings by team, Activity by area.
4. Media: owner scope, no delete in use, where each is used, grid or table.
5. Image fields: Choose from Media, danger Remove, full-screen View.
6. Connect on the shared tokens.
7. Pages in three parts; Connect's landing page as an editable site page.
8. A fix to the auth screens: the serif title, no menu for a visitor signed out.
9. Connect's landing page, `/register` and the status page.
10. Docs.

No schema change: images are referenced by key in page content and rows, areas are a map
in code, and Connect's landing page is a `SitePage` row. Production gets the page's row by
a publish in the editor after the merge; until then it shows its built-in words.

## Checks

Done on 2026-10-31, on local dev servers (manage 3001, Connect 3002) and the development
database, Clerk's bot check let through by its testing token:

- `pnpm lint` and `pnpm check-types` (21 tasks); the db tests (611), with new ones for
  the area map, the media owner and Connect's page.
- Connect's landing page, desktop and phone. `/register` with a new email
  (`claude_vendor+clerk_test@example.com`): the code, the account, the pending vendor
  "Claude Test Transport", its status page. The same email again: signed in by the
  password typed and the new-browser code, then sent home as registered already. The
  sign-in's password, "Forgot password?" and code paths. An account with no password
  (`claude_seo+clerk_test`) offered one on its account page.
- Manage as SUPER: Pages in three parts, Connect's editor and its publish, Media, Staff.
  As SEO: `/~` and a location open on Pages, Settings refused, Activity's areas.

Left in the development database by these checks: the Clerk user and the `User` row of
`claude_vendor+clerk_test@example.com`, its vendor "Claude Test Transport" (pending) and
its log entry, Connect's published page and its publish entry, and the sessions.

Not yet tried in a browser: the website's sign-up and account page, changing an email,
adding or changing a password, signing a device out, "Choose from Media", the full-screen
View, Add staff and Make staff, and the other teams' menus.

## Later

- The welcome email for an account made by staff.
- Connect's landing page indexed, after the cutover.
- Device Trust on or off, the user's call.
- Production: publish Connect's page in the editor after the merge (until then it shows
  its built-in words), and check its Clerk instance requires a password at sign-up.
