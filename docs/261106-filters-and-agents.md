# Service and class filters, and adding an agent from a booking

Asked for by the developer on 2026-11-06, in the same PR as
`docs/261106-interaction-speed.md`.

## Filters: the service and the vehicle class

Bookings and Assign each have a Filters button. Both now offer the same filters about
the trip, from one place (`apps/manage/app/_lib/trip-filters.ts`):

- **Service:** Car with driver or Coach charter (`?service=`).
- **Vehicle class:** on Bookings every class, on Assign the classes its trips name
  (`?class=`). With a service chosen, the list keeps only that service's classes. A class
  of the other service, or one no longer offered, is no filter, so changing the service
  never leaves an empty list behind a filter nobody can see.
- **Trip type:** one-way or hourly (`?trip=`), as before.

A booking is the service's or the class's when one of its trips is. A booking with a
car and a coach shows under both services. On Bookings the database does the matching
(`BookingFilter.category` and `vehicleClassId` in `@repo/db`). On Assign the trips are
already loaded, and the page matches them itself, as it does its other filters.

The Filters panel is 20rem wide, so "Any, Car with driver, Coach charter" fits on one line.

## Adding an agent from New booking

An agent is a vendor that offers "agent". Until now, one not yet entered had to be added
under Fleet > Vendors before the booking could be made. Now a "+" beside New booking's
Agent list opens **Add an agent**:

- **What it asks:** company or individual, name, SSM or IC number, contact person,
  phone, email, address, how often it is invoiced, and the locations it serves. Under a
  location, that location is ticked already. These fields are the vendor form's own
  (`VendorDetailsFields`, `InvoicePeriodField` and `VendorLocationChecks` in
  `@repo/console/VendorFieldsSection`). The bank and the Connect owner are left for the
  vendor's page.
- **An agent only:** the server sets the services to "agent" whatever is posted, so the
  dialog never makes any other vendor. The agent is active at once.
- **Who may add one:** whoever may enter bookings (`bookings.create`, Reservation and
  Sales), not only Operation, who keeps the vendors (`fleet.manage`). This is the point
  of the button.
- **Once added**, the agent is chosen for the booking and the list keeps it. A refusal
  shows under its field, and the dialog keeps what was typed. The dialog is drawn on the
  page's body, outside the booking's form, as the saved-address dialog is.
