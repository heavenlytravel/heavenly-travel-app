# Tour guides

Status: decided with the user on 2026-11-03, built on `feat/tour-guide`, not yet merged. Item 4
of docs/261102-booking-ops.md. The user runs `db:push`.

A tour guide goes on a trip beside its vehicle and driver. Vendors supply guides as they
supply drivers, and Operation assigns a guide on the trip's page under Assign.

## Decisions

- **"Tour guide" is a vendor service** (`VENDOR_SERVICES`), ticked at sign-up in Connect
  and on the vendor's page in `manage.`. A vendor offering it keeps its guides in Connect,
  under Guides; Operation keeps every vendor's under Fleet > Tour Guides, until the menu
  is reworked (see "Menu" below).
- **A guide is a record, like a vehicle: no account** (user, 2026-11-03). Name, phone, the
  languages they guide in (ticked from `GUIDE_LANGUAGES`, the one list customers choose
  from too), where they are based, the MOTAC licence's expiry, notes, active or not. The
  expiry is kept in the form only: no due badge, filter or count for guides (user,
  2026-11-03); Assign still greys a guide whose licence has expired on the trip's day. Inactive, they leave the trips they were
  accepted for, as a driver does. One who has been on a trip cannot be deleted.
- **The vendor accepts and names the guide,** as for a vehicle: there is no guide's own
  yes, and on the day the driver reports the trip. Ours is accepted by Operation.
- **Per trip.** `TripItemDetails.guideLanguage` is the language paid for; a trip with
  one (`hasGuide`) needs three roles assigned (`rolesOf`), vehicle, driver and guide,
  each its own `TripPart` (role "guide", `guideId`), its own vendor and its own pay. A
  guide goes with any class; a clash with another trip of theirs refuses, and the drive
  between trips warns, as for a driver.
- **A paid add-on, for car and coach, one-way and hourly** (user, 2026-11-03, replacing
  "included on a coach" and "free on a car"). Nothing is included any more.
- **Guide rates, per location** (user, 2026-11-03; G1 answered): Rates > Tour Guide Rates,
  one row per language with an "On the website" switch and five prices: One-way, 4
  hours, 8 hours, 12 hours and Extra hour (`GuideRate`). The first sheet from Ops:
  Malay RM80 / 150 / 200, English 120 / 200 / 250, Mandarin 150 / 300 / 350, Arabic
  200 / 360 / 450 (one-way, half day = 4 hours, full day = 8 hours); 12 hours and the
  extra hour are Ops' to fill.
- **A language is sold on a trip only when it is switched on and the trip's price is
  set** (`guideOffers`): One-way for a one-way trip, the hire's duration for an hourly
  one, plus Extra hour when hours are added. Missing anything, it is not shown at all.
  With no language on sale, the Add-ons do not show. A booking of several trips shows
  the languages on sale for every trip, at their sum (`guideOffersOnAll`).
- **The customer chooses one language** (user, 2026-11-03, replacing "one or more"),
  since the price is the language's. The receipt carries it as its own line, "Tour
  guide, English", with no surcharge (`withGuideCharge`); the quote is checked again
  when booking.
- **Any other language may be asked for, free** (`guideRequest`): "Ask for a guide in
  another language". It is shown on the trip and on Assign. If Operation finds a guide,
  it amends the trip to that language; the extra payment waits for the Finance flow
  (additional invoice).
- **Assign: the guide must speak the language paid for.** One who does not is greyed,
  "Does not speak Arabic", and refused by the writer, for Operation and for a vendor
  naming one in Connect.
- **Add-ons sit under "Your vehicle" on the Confirm page** (user, 2026-11-03, replacing
  the separate Add-ons step). Room for more add-ons later.
- **The console books and amends as the website does** (user, 2026-11-03): its Details
  step has the same Add-ons for New booking and for Amend, at the same prices. An amend
  re-prices the guide like the rest of the trip, and, like any amend, asks every role
  again.
- **One person may be the driver and the guide** (G4, user, 2026-11-03), and the vendor's
  owner too: they are entered in both places, as a driver and as a guide, and named on
  both cards. Their Connect job does not show them their own name as the guide (same
  phone). Nothing checks that the two records are one person, so a clash between
  their driving one trip and guiding another is not caught.
- **A vendor is asked for a guide only when it offers tour guides,** or is ours.

## Pay and bank details

Decided with the user on 2026-11-03.

- **Who is paid.** A vehicle's pay goes to its vendor, the company. A driver's pay, a
  coach driver's tip and a guide's pay go to the person themselves. `TripPart.costSen`
  is what we pay for that part; ours stays 0.
- **Driver tip, coach only** (`tipsDriver`). Operation enters it on Assign beside the
  pay, for our drivers too. It comes out of what the customer already paid: nothing is
  added at Confirm. It shows on the trip's driver card, the booking page and the
  vendor's offer in Connect.
- **Bank details** (`src/bank-input.ts`): the bank, from `MALAYSIAN_BANKS`, the account
  number in digits and the name on the account, all three or none, on every vendor,
  driver and tour guide. A vendor gives its own at registration in Connect; a driver's
  and a guide's are entered on their forms, in Manage or by their vendor in Connect.
- **Masked everywhere** (`maskTail`, `MaskedText`, `SecretInput`): an account number
  and a vendor's SSM or IC number show as "•••• 4821", with an eye button to show
  them, as an app blurs an account's email. The activity log keeps them masked
  (`maskedForLog`). Paying out (a payout run, statements) is not built yet.

## To confirm

| #   | Question                                | Who | Holds up                       |
| --- | --------------------------------------- | --- | ------------------------------ |
| G7  | Is `GUIDE_LANGUAGES` the right list?    | Ops | Nothing                        |
| G8  | The 12-hour and extra hour guide prices | Ops | Selling a guide on those hires |

G1 (how a guide is priced) and G6 (coach one-way) were answered on 2026-11-03: per
location, by language and trip shape, on every trip, paid.

## Production order

The push adds two tables (`Guide`, `GuideRate`), the bank fields on `Vendor`, `Driver` and
`Guide` and `TripPart.tipSen`, all with defaults, nullable `TripPart.guideId` and
nullable `TripItemDetails.guideLanguage` and `guideRequest`, so today's code runs on it
unchanged. Push before the merge (`pnpm db:push`, then `pnpm db:push:prod`). Nothing is
sold until Ops fills Tour Guide Rates and switches a language on; enter a guide who speaks
it, ours or a vendor's, before then.

## Not yet

- Connect's getting-started list and the vendor's home count vehicles and drivers only.
- The menu: Vehicles, Drivers, Tour Guides and Vendors are all a vendor's, and the user
  asked for the menu to be rethought as a whole, not only for guides.
