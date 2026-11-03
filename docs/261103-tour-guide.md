# Tour guides

Status: decided with the user on 2026-11-03, built on `feat/tour-guide`, not yet merged. Item 4
of docs/261102-booking-ops.md. The user runs `db:push`.

A tour guide goes on a trip beside its vehicle and driver. Vendors supply guides as they
supply drivers, and Operation assigns a guide on the trip's page under Assign.

## Decisions

- **"Tour guide" is a vendor service** (`VENDOR_SERVICES`), ticked at sign-up in Connect
  and on the vendor's page in `manage.`. A vendor offering it keeps its guides in Connect,
  under Guides; Operation keeps every vendor's under Fleet > Guides.
- **A guide is a record, like a vehicle: no account** (user, 2026-11-03). Name, phone, the
  languages they guide in (typed, separated by commas), where they are based, the MOTAC
  licence's expiry, notes, active or not. Inactive, they leave the trips they were
  accepted for, as a driver does. One who has been on a trip cannot be deleted.
- **The vendor accepts and names the guide,** as for a vehicle: there is no guide's own
  yes, and on the day the driver reports the trip. Ours is accepted by Operation.
- **Per trip.** `TripItemDetails.withGuide` says a trip goes with a guide; a trip with one
  needs three roles assigned (`rolesOf`), vehicle, driver and guide, each its own
  `TripPart` (role "guide", `guideId`), its own vendor and its own "Pay vendor". A guide
  goes with any class, so any of them may be picked for any trip; a clash with another
  trip of theirs refuses, and the drive between trips warns, as for a driver.
- **A coach always goes with a guide, included in its price** (user, 2026-11-03). Every
  coach trip booked from now on has `withGuide`; the customer sees "Tour guide:
  Included", on the Add-ons step and on the trip's details. Trips booked before keep
  none, and amending a trip never adds or removes its guide.
- **A car's guide is an add-on, not built yet:** how it is priced waits on Ops (G1). Until
  then the Add-ons step lists nothing to add for a car, and the website skips it.
- **The Add-ons step** comes between choosing the vehicle and Confirm on the website
  (user, 2026-11-03): each trip's add-ons, with "for every trip" once there is something
  to choose. Room for more add-ons later.
- **A vendor is asked for a guide only when it offers tour guides,** or is ours.

## To confirm

| #   | Question                                                                                | Who | Holds up                           |
| --- | --------------------------------------------------------------------------------------- | --- | ---------------------------------- |
| G1  | A car's guide: flat per trip, per Duration (4/8/12h) or per hour? On one-way trips too? | Ops | The car add-on                     |
| G3  | Does the customer pick a language?                                                      | Ops | Nothing                            |
| G4  | Driver-guides: one person as driver and guide on one trip?                              | Ops | Nothing                            |
| G6  | A coach's guide on a one-way coach transfer too, or hourly coach hire only?             | Ops | Nothing; built as every coach trip |

## Production order

The push adds a table (`Guide`), nullable `TripPart.guideId` and
`TripItemDetails.withGuide` with a default, so today's code runs on it unchanged. Push before
the merge (`pnpm db:push`, then `pnpm db:push:prod`). After the merge, coach trips booked
from then on wait for a guide before they are assigned: Operation needs a guide entered,
ours or a vendor's, before the first one.

## Not yet

- A driver's job in Connect does not name the trip's guide; the vendor's job does.
- The console search finds no guide, and the dashboard counts no guide's licence due.
- Connect's getting-started list and the vendor's home count vehicles and drivers only.
