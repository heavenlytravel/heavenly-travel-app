"use client";

import {
  BOOKING_RULES,
  CONTACT_NAME_MAX_LENGTH,
  formatMyr,
  parseContact,
  TRIP_CATEGORY_LABELS,
  type BBox,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { PlusIcon } from "@repo/ui/icons";
import { useState } from "react";
import { SCOPE_FIELD } from "../../../../_lib/fleet-form";
import { ALL, bookingsHref, type ScopeSlug } from "../../../../_lib/routes";
import { useActionForm } from "../../../../_lib/use-action-form";
import { BookingSummary } from "../_components/BookingSummary";
import { DetailsStep } from "../_components/DetailsStep";
import { HiddenFields } from "../_components/HiddenFields";
import { TripStep, VehicleStep } from "../_components/ItemSteps";
import { Step, StepFoot } from "../_components/Step";
import {
  agreedPriceIssue,
  bookingTotalSen,
  chosenVehicle,
  clashNotes,
  CONTACT_FIELDS,
  detailsFields,
  EMPTY_BOOKING_DETAILS,
  EMPTY_VEHICLE,
  newTripDraft,
  placesLine,
  tripFields,
  tripQuotedSen,
  tripsByStart,
  vehicleFields,
  vehicleLine,
  type BookingDetails,
  type TripDraft,
  type VehicleDraft,
} from "../_lib/trip-form";
import { createManualBookingAction } from "./actions";

type Contact = { name: string; phone: string; email: string };

/** The step open: the customer, a trip (`trip:` and its id), the vehicle or the details; null when every step is folded. */
type OpenStep = "customer" | "vehicle" | "details" | `trip:${string}` | null;

const EMPTY_CONTACT: Contact = { name: "", phone: "", email: "" };

/**
 * The manual booking, in numbered steps on one page: the customer, each
 * trip, the vehicle and the details. "Add another trip" adds a trip to
 * the booking, as the website's trip list does, with its rules: one
 * vehicle does every trip, so it is chosen once for them all, in one
 * category, and no trip may start while another is going; the trips are
 * numbered and booked by start, at most `maxTripsPerBooking`. The flights,
 * child seats and the note are asked once. One step is open at a time; a
 * finished one folds to a line with "Edit", so a detail that changes
 * mid-call is one click away and nothing entered is lost. The summary
 * beside the steps keeps what was entered, each trip's price, the total
 * and the button in view; an agreed price is set there, per trip. The
 * server prices every trip again and applies the agreed prices itself.
 * Opened in a location, its place fields suggest that location's places
 * first, and the booking opens there once made. See
 * docs/261027-multi-trip-booking.md.
 */
export function NewBookingForm({
  hasGoogle,
  scope,
  near,
}: {
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
  /** Where the form was opened: the booking opens there once made. */
  scope: ScopeSlug;
  /** In a location, the box whose places the place fields suggest first. */
  near?: BBox;
}) {
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [trips, setTrips] = useState<TripDraft[]>(() => [newTripDraft()]);
  const [vehicle, setVehicle] = useState<VehicleDraft>(EMPTY_VEHICLE);
  const [details, setDetails] = useState<BookingDetails>(EMPTY_BOOKING_DETAILS);
  const [open, setOpen] = useState<OpenStep>("customer");
  const create = useActionForm(createManualBookingAction, {
    done: "Booking created. The customer gets the received email.",
  });

  /** Opens a step, putting the trips in order by start, now that the one typed in is folded. */
  function openStep(next: OpenStep) {
    setTrips((current) => tripsByStart(current));
    setOpen(next);
  }
  const patchTrip = (id: string, patch: Partial<TripDraft>) =>
    setTrips((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...patch } : draft,
      ),
    );
  function addTrip() {
    const added = newTripDraft(trips[0]?.trip.category);
    setTrips((current) => [...tripsByStart(current), added]);
    setOpen(`trip:${added.id}`);
  }
  function removeTrip(id: string) {
    setTrips((current) => current.filter((draft) => draft.id !== id));
    setOpen(null);
  }

  const customer = parseContact(contact);
  const several = trips.length > 1;
  const category = trips[0]!.trip.category;
  const clashes = clashNotes(trips);
  const chosen = chosenVehicle(trips, vehicle);
  const unpriced = trips.findIndex((draft) => draft.quote === null);
  const clashing = trips.findIndex((draft) => clashes.has(draft.id));
  const priceIssue = trips
    .map((draft, index) => {
      const issue = agreedPriceIssue(draft);
      return issue && several ? `Trip ${index + 1}: ${issue}` : issue;
    })
    .find((issue) => issue !== null);
  const missing = !customer.ok
    ? "Fill in the customer."
    : unpriced >= 0
      ? several
        ? `Fill in trip ${unpriced + 1}.`
        : "Fill in the trip."
      : clashing >= 0
        ? `Change the time of trip ${clashing + 1}: ${clashes
            .get(trips[clashing]!.id)!
            .label.toLowerCase()}.`
        : !chosen
          ? "Choose a vehicle."
          : (priceIssue ?? null);
  const totalSen = bookingTotalSen(trips, chosen, true);
  const locations = [
    ...new Set(trips.flatMap((draft) => draft.quote?.location ?? [])),
  ];

  return (
    <form
      {...create.formProps}
      // The trips post by start; the list takes that order too, so a
      // refusal's "Trip 2" is the trip shown as 2.
      onSubmit={(event) => {
        setTrips((current) => tripsByStart(current));
        return create.formProps.onSubmit(event);
      }}
      // Enter in a field does not create the booking: the button does.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
      className="@container"
    >
      <input type="hidden" name={SCOPE_FIELD} value={scope ?? ALL} />
      <input type="hidden" name={CONTACT_FIELDS.name} value={contact.name} />
      <input type="hidden" name={CONTACT_FIELDS.phone} value={contact.phone} />
      <input type="hidden" name={CONTACT_FIELDS.email} value={contact.email} />
      {tripsByStart(trips).map((draft, index) => (
        <HiddenFields
          key={draft.id}
          fields={tripFields(index + 1, draft, true)}
        />
      ))}
      <HiddenFields fields={vehicleFields(chosen, vehicle)} />
      <HiddenFields fields={detailsFields(details, category)} />

      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
        <div className="grid min-w-0 gap-3">
          <Step
            number={1}
            title="Customer"
            done={customer.ok}
            summary={
              customer.ok
                ? [contact.name, contact.phone, contact.email].join(" · ")
                : "Who the booking is for"
            }
            open={open === "customer"}
            onOpen={() => openStep("customer")}
          >
            <CustomerFields contact={contact} onChange={setContact} />
            <StepFoot
              disabled={!customer.ok}
              missing={
                customer.ok || contact === EMPTY_CONTACT ? null : customer.error
              }
              onNext={() => openStep(`trip:${trips[0]!.id}`)}
            />
          </Step>

          {trips.map((draft, index) => {
            const after = trips[index + 1];
            return (
              <TripStep
                key={draft.id}
                number={2}
                title={`Trip ${index + 1} · ${TRIP_CATEGORY_LABELS[draft.trip.category]}`}
                draft={draft}
                onChange={(patch) => patchTrip(draft.id, patch)}
                open={open === `trip:${draft.id}`}
                onOpen={() => openStep(`trip:${draft.id}`)}
                onNext={() => openStep(after ? `trip:${after.id}` : "vehicle")}
                hasGoogle={hasGoogle}
                categoryLocked={several}
                near={near}
                clash={clashes.get(draft.id) ?? null}
                aside={
                  several ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrip(draft.id)}
                    >
                      Remove trip
                    </Button>
                  ) : null
                }
              />
            );
          })}
          {trips.length < BOOKING_RULES.maxTripsPerBooking ? (
            <button
              type="button"
              onClick={addTrip}
              className="flex h-12 items-center justify-center gap-2 rounded-card border border-dashed border-slot text-sm font-semibold text-brand transition-colors hover:bg-white focus-ring"
            >
              <PlusIcon className="size-4" />
              Add another trip
            </button>
          ) : (
            <p className="px-1 text-sm text-muted">
              A booking takes up to {BOOKING_RULES.maxTripsPerBooking} trips.
              Enter the rest as a booking of their own.
            </p>
          )}

          <VehicleStep
            number={3}
            trips={trips}
            vehicle={vehicle}
            onChange={(patch) =>
              setVehicle((current) => ({ ...current, ...patch }))
            }
            open={open === "vehicle"}
            onOpen={() => openStep("vehicle")}
            onNext={() => openStep("details")}
          />
          <DetailsStep
            number={4}
            details={details}
            onChange={(patch) =>
              setDetails((current) => ({ ...current, ...patch }))
            }
            category={category}
            airports={{
              arriving: trips.some((draft) => draft.quote?.pickupAirport),
              departing: trips.some((draft) => draft.quote?.dropoffAirport),
            }}
            done={chosen !== null}
            open={open === "details"}
            onOpen={() => openStep("details")}
            onDone={() => openStep(null)}
          />
        </div>

        <aside className="@3xl:sticky @3xl:top-20">
          <BookingSummary
            meta={locations.join(", ") || undefined}
            rows={[
              {
                label: "Customer",
                value: customer.ok ? (
                  <>
                    {contact.name}
                    <span className="block text-muted">{contact.phone}</span>
                  </>
                ) : (
                  "—"
                ),
              },
              ...trips.map((draft, index) => ({
                label: several ? `Trip ${index + 1}` : "Trip",
                value: draft.quote ? (
                  <>
                    {placesLine(draft.quote)}
                    <span className="block text-xs text-muted">
                      {draft.quote.startsAt}
                    </span>
                  </>
                ) : (
                  "—"
                ),
              })),
              {
                label: "Vehicle",
                value: chosen
                  ? vehicleLine(trips, vehicle, { price: false })
                  : "—",
              },
            ]}
            trips={trips.map((draft, index) => ({
              id: draft.id,
              label: several ? `Trip ${index + 1}` : null,
              quotedSen: tripQuotedSen(draft, chosen),
              agreedPrice: draft.agreedPrice,
              priceReason: draft.priceReason,
            }))}
            onPriceChange={patchTrip}
            canPrice
            submit={
              <Button
                type="submit"
                disabled={missing !== null}
                pending={create.pending}
              >
                {create.pending
                  ? "Creating…"
                  : totalSen !== null
                    ? `Create booking · ${formatMyr(totalSen)}`
                    : "Create booking"}
              </Button>
            }
            missing={missing}
            error={create.error}
            cancelHref={bookingsHref(scope)}
            foot="The booking is received until Reservation confirms it, as one from the website is, and the customer gets the received email."
          />
        </aside>
      </div>
    </form>
  );
}

/** Who the booking is for: the name the driver asks for, a phone and an email. */
function CustomerFields({
  contact,
  onChange,
}: {
  contact: Contact;
  onChange: (contact: Contact) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name for the driver" className="sm:col-span-2">
        <Input
          maxLength={CONTACT_NAME_MAX_LENGTH}
          autoComplete="off"
          value={contact.name}
          onChange={(e) => onChange({ ...contact, name: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <Input
          type="tel"
          placeholder="+60 12 345 6789"
          autoComplete="off"
          value={contact.phone}
          onChange={(e) => onChange({ ...contact, phone: e.target.value })}
        />
      </Field>
      <Field
        label="Email"
        hint="The booking emails go here. An email with an account puts the booking under it."
      >
        <Input
          type="email"
          autoComplete="off"
          value={contact.email}
          onChange={(e) => onChange({ ...contact, email: e.target.value })}
        />
      </Field>
    </div>
  );
}
