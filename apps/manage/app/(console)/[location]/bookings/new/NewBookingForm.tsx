"use client";

import {
  andList,
  BOOKING_RULES,
  CONTACT_NAME_MAX_LENGTH,
  LEGACY_INVOICE_MAX,
  parseContact,
  parseLegacyInvoiceNumber,
  TRIP_CATEGORY_LABELS,
  type BBox,
  type TripCategory,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { PlusIcon } from "@repo/ui/icons";
import { Switch } from "@repo/ui/switch";
import { useState } from "react";
import { SCOPE_FIELD } from "@repo/console/fleet-form";
import { ALL, bookingsHref, type ScopeSlug } from "../../../../_lib/routes";
import { useActionForm } from "@repo/console/use-action-form";
import { AgentPicker, type Agent } from "../_components/AgentPicker";
import { BookingSummary } from "../_components/BookingSummary";
import { BookingTripStep, itemIssue } from "../_components/BookingTripStep";
import { HiddenFields } from "../_components/HiddenFields";
import { NewBookingChoice } from "../_components/NewBookingChoice";
import { Step, StepFoot } from "../_components/Step";
import { quoteTripAction } from "../_lib/quote-action";
import {
  AGENT_FIELD,
  agreedPriceIssue,
  bookingTotalSen,
  clashNotes,
  CONTACT_FIELDS,
  itemFields,
  itemsByStart,
  itemVehicle,
  LEGACY_INVOICE_FIELD,
  newItemDraft,
  placesLine,
  SAME_VEHICLE_FIELD,
  tripInput,
  tripIssue,
  tripPriceLines,
  vehicleLine,
  type ItemDetails,
  type ItemDraft,
  type TripDraft,
  type VehicleDraft,
} from "../_lib/trip-form";
import { createManualBookingAction } from "./actions";

type Contact = { name: string; phone: string; email: string };

/** The step open: the customer or a trip (`trip:` and its id); null when every step is folded. */
type OpenStep = "customer" | `trip:${string}` | null;

const EMPTY_CONTACT: Contact = { name: "", phone: "", email: "" };

/**
 * The manual booking, in numbered steps on one page: the customer, then
 * each trip, a step with everything it takes: the trip, its vehicle and
 * group, its flight, child seats, note and tour guide. "Add another trip"
 * adds one, starting from the choices of the one before it; the trips are
 * numbered and booked by start, at most `maxTripsPerBooking`. With several
 * trips, "Same vehicle for every trip" (on to start with) has one vehicle
 * do them all: trip 1 chooses it for every trip, every trip takes its
 * category, and no trip may start while another is going. Off, each trip
 * chooses its own: a car, then a coach, at the same time if need be.
 * Turning it back on asks first when a trip would lose a vehicle or a
 * category of its own to trip 1's. One
 * step is open at a time; a finished one folds to a line with "Edit", so a
 * detail that changes mid-call is one click away and nothing entered is
 * lost. The summary beside the steps keeps the customer, each trip with
 * its price and what it is made of, the total and the button in view; an
 * agreed price is set there, per trip. The old system's invoice number, a
 * note, goes with the customer. Above the one button, a choice: confirm
 * now, with what that bills, or save for later as received. The server
 * prices every trip again and applies the agreed
 * prices itself. Opened in a location, its place fields suggest that
 * location's places first, and the booking opens there once made. See
 * docs/261027-multi-trip-booking.md.
 */
export function NewBookingForm({
  hasGoogle,
  scope,
  near,
  agents,
}: {
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
  /** Where the form was opened: the booking opens there once made. */
  scope: ScopeSlug;
  /** In a location, the box whose places the place fields suggest first. */
  near?: BBox;
  /** The agents a booking may come through, by name. */
  agents: readonly Agent[];
}) {
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [agentId, setAgentId] = useState("");
  const [legacy, setLegacy] = useState("");
  const [confirmNow, setConfirmNow] = useState(true);
  // Added from the form and not yet in `agents`, until the refresh brings them.
  const [added, setAdded] = useState<Agent[]>([]);
  const allAgents = [
    ...agents,
    ...added.filter((one) => !agents.some((listed) => listed.id === one.id)),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const agent = allAgents.find((a) => a.id === agentId) ?? null;
  const [confirmDialog, confirm] = useConfirm();
  const [items, setItems] = useState<ItemDraft[]>(() => [newItemDraft()]);
  const [sameVehicle, setSameVehicle] = useState(true);
  // The vehicle every trip shares while they do; each item keeps its own for when they do not.
  const [sharedVehicle, setSharedVehicle] = useState<VehicleDraft>(
    () => items[0]!.vehicle,
  );
  const [open, setOpen] = useState<OpenStep>("customer");
  const create = useActionForm(createManualBookingAction, {
    done: "Booking created.",
  });

  const shared = sameVehicle ? sharedVehicle : null;
  const several = items.length > 1;
  const trips = items.map((item) => item.trip);

  /** Opens a step, putting the trips in order by start, now that the one typed in is folded. */
  function openStep(next: OpenStep) {
    setItems((current) => itemsByStart(current));
    setOpen(next);
  }
  const patchItem = (id: string, patch: (item: ItemDraft) => ItemDraft) =>
    setItems((current) =>
      current.map((item) => (item.trip.id === id ? patch(item) : item)),
    );
  function patchTrip(id: string, patch: Partial<TripDraft>) {
    patchItem(id, (item) => ({ ...item, trip: { ...item.trip, ...patch } }));
    const category = patch.trip?.category;
    if (sameVehicle && category && id === items[0]!.trip.id) {
      followCategory(category, items.slice(1));
    }
  }
  /**
   * Puts trips in the category the vehicle they share is of, each priced
   * again: their prices were for the other. An answer for a trip changed
   * meanwhile is dropped.
   */
  function followCategory(category: TripCategory, others: ItemDraft[]) {
    for (const other of others) {
      if (other.trip.trip.category === category) continue;
      const trip = { ...other.trip.trip, category };
      const id = other.trip.id;
      patchItem(id, (item) => ({
        ...item,
        trip: { ...item.trip, trip, quote: null, quoteError: null },
      }));
      if (tripIssue(trip)) continue;
      void answerOf(quoteTripAction(tripInput(trip))).then((result) =>
        patchItem(id, (item) =>
          JSON.stringify(item.trip.trip) !== JSON.stringify(trip)
            ? item
            : {
                ...item,
                trip: {
                  ...item.trip,
                  ...("error" in result
                    ? { quote: null, quoteError: result.error }
                    : { quote: result, quoteError: null }),
                },
              },
        ),
      );
    }
  }
  async function changeSameVehicle(on: boolean) {
    if (on && !(await confirmSameVehicle())) return;
    setSameVehicle(on);
    if (on) {
      // Trip 1's vehicle does them all, and every trip takes its category.
      setSharedVehicle(items[0]!.vehicle);
      followCategory(items[0]!.trip.trip.category, items.slice(1));
    } else {
      // Each trip starts from the vehicle they shared.
      setItems((current) =>
        current.map((item) => ({ ...item, vehicle: { ...sharedVehicle } })),
      );
    }
  }
  /**
   * Whether trip 1's vehicle may take over every trip: asked only when a
   * trip has a category or vehicle of its own, which turning the switch
   * on loses.
   */
  async function confirmSameVehicle(): Promise<boolean> {
    const first = items[0]!;
    const own = items.flatMap((item, index) =>
      index > 0 &&
      (item.trip.trip.category !== first.trip.trip.category ||
        JSON.stringify(item.vehicle) !== JSON.stringify(first.vehicle))
        ? [String(index + 1)]
        : [],
    );
    if (own.length === 0) return true;
    const vehicle = itemVehicle(items, 0, null).chosen
      ? vehicleLine([first.trip], first.vehicle, { price: false })
      : null;
    return confirm({
      title: "Use trip 1's vehicle for every trip?",
      description: `${own.length === 1 ? "Trip" : "Trips"} ${andList(own)} lose their own vehicle and group and take trip 1's: ${[TRIP_CATEGORY_LABELS[first.trip.trip.category], vehicle].filter(Boolean).join(", ")}. A trip in another category is priced again, and trips at the same time must then be moved.`,
      action: "Use trip 1's vehicle",
      danger: true,
    });
  }
  function addTrip() {
    const sorted = itemsByStart(items);
    const last = sorted.at(-1)!;
    const added = newItemDraft(
      shared ? { ...last, vehicle: sharedVehicle } : last,
    );
    setItems([...sorted, added]);
    setOpen(`trip:${added.trip.id}`);
  }
  async function removeTrip(id: string, label: string) {
    const yes = await confirm({
      title: `Remove ${label}?`,
      description: "Its places, day and time, vehicle and details are lost.",
      action: "Remove trip",
      danger: true,
    });
    if (!yes) return;
    setItems((current) => current.filter((item) => item.trip.id !== id));
    setOpen(null);
  }

  const customer = parseContact(contact);
  const legacyNumber = parseLegacyInvoiceNumber(legacy);
  const customerIssue = !customer.ok
    ? customer.error
    : !legacyNumber.ok
      ? legacyNumber.error
      : null;
  // One vehicle does one trip at a time; trips on their own vehicles may meet.
  const clashes = shared && several ? clashNotes(trips) : new Map();
  const vehicles = items.map((_, index) => itemVehicle(items, index, shared));
  const issues = items.map((item, index) =>
    itemIssue(item, vehicles[index]!.chosen, clashes.get(item.trip.id) ?? null),
  );
  const unfinished = issues.findIndex((issue) => issue !== null);
  const priceIssue = items
    .map((item, index) => {
      const issue = agreedPriceIssue(item.trip);
      return issue && several ? `Trip ${index + 1}: ${issue}` : issue;
    })
    .find((issue) => issue !== null);
  const missing =
    customerIssue !== null
      ? "Fill in the customer."
      : unfinished >= 0
        ? several
          ? `Trip ${unfinished + 1}: ${issues[unfinished]}`
          : issues[unfinished]!
        : (priceIssue ?? null);
  const totalSen = bookingTotalSen(items, shared, true);
  const locations = [
    ...new Set(items.flatMap((item) => item.trip.quote?.location ?? [])),
  ];
  const sorted = itemsByStart(items);

  return (
    <form
      {...create.formProps}
      // The trips post by start; the list takes that order too, so a
      // refusal's "Trip 2" is the trip shown as 2.
      onSubmit={(event) => {
        setItems((current) => itemsByStart(current));
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
      <input type="hidden" name={AGENT_FIELD} value={agentId} />
      <input type="hidden" name={LEGACY_INVOICE_FIELD} value={legacy} />
      {shared ? (
        <input type="hidden" name={SAME_VEHICLE_FIELD} value="on" />
      ) : null}
      {sorted.map((item, number) => (
        <HiddenFields
          key={item.trip.id}
          fields={itemFields(number + 1, items, items.indexOf(item), shared)}
        />
      ))}

      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
        <div className="grid min-w-0 gap-3">
          <Step
            number={1}
            title="Customer Info"
            done={customerIssue === null}
            summary={
              customerIssue === null
                ? [
                    agent?.name,
                    contact.name,
                    contact.phone,
                    contact.email,
                    legacy.trim() ? `Old invoice ${legacy.trim()}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Who the booking is for"
            }
            open={open === "customer"}
            onOpen={() => openStep("customer")}
          >
            <AgentPicker
              agents={allAgents}
              value={agentId}
              onChange={setAgentId}
              onAdded={(one) => setAdded((list) => [...list, one])}
            />
            <CustomerFields contact={contact} onChange={setContact} />
            <Field
              label="Old invoice number"
              hint={
                legacyNumber.ok ? (
                  "Optional. The old system's number, such as HT1223, as a note for the team. It bills nothing."
                ) : (
                  <span className="text-danger">{legacyNumber.error}</span>
                )
              }
              className="mt-4 sm:max-w-80"
            >
              <Input
                maxLength={LEGACY_INVOICE_MAX}
                autoComplete="off"
                value={legacy}
                onChange={(e) => setLegacy(e.target.value)}
              />
            </Field>
            <StepFoot
              disabled={customerIssue !== null}
              missing={
                customerIssue === null ||
                (contact === EMPTY_CONTACT && legacyNumber.ok)
                  ? null
                  : customerIssue
              }
              onNext={() => openStep(`trip:${items[0]!.trip.id}`)}
            />
          </Step>

          {several ? (
            <label className="flex items-center gap-3 rounded-card bg-white px-5 py-3.5 shadow-card">
              <Switch
                checked={sameVehicle}
                onCheckedChange={(on) => void changeSameVehicle(on)}
                label="Same vehicle for every trip"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-semibold text-ink">
                  Same vehicle for every trip
                </span>
                <span className="text-caption text-muted">
                  {sameVehicle
                    ? "Trip 1 chooses it for them all, so no trip may start while another is going."
                    : "Each trip chooses its own category, vehicle and group, and may run at the same time as another."}
                </span>
              </span>
            </label>
          ) : null}

          {items.map((item, index) => {
            const after = items[index + 1];
            const { vehicle, chosen } = vehicles[index]!;
            const id = item.trip.id;
            return (
              <BookingTripStep
                key={id}
                number={index + 2}
                index={index}
                item={item}
                trips={trips}
                shared={shared !== null && several}
                vehicle={vehicle}
                chosen={chosen}
                clash={clashes.get(id) ?? null}
                onTrip={(patch) => patchTrip(id, patch)}
                onVehicle={(patch) =>
                  shared
                    ? setSharedVehicle((current) => ({ ...current, ...patch }))
                    : patchItem(id, (current) => ({
                        ...current,
                        vehicle: { ...current.vehicle, ...patch },
                      }))
                }
                onDetails={(patch: Partial<ItemDetails>) =>
                  patchItem(id, (current) => ({
                    ...current,
                    details: { ...current.details, ...patch },
                  }))
                }
                open={open === `trip:${id}`}
                onOpen={() => openStep(`trip:${id}`)}
                onNext={() => openStep(after ? `trip:${after.trip.id}` : null)}
                hasGoogle={hasGoogle}
                near={near}
                aside={
                  several ? (
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      onClick={() => removeTrip(id, `trip ${index + 1}`)}
                    >
                      Remove trip
                    </Button>
                  ) : null
                }
              />
            );
          })}
          {items.length < BOOKING_RULES.maxTripsPerBooking ? (
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
            ]}
            trips={items.map((item, index) => {
              const { vehicle, chosen } = vehicles[index]!;
              const quote = item.trip.quote;
              return {
                id: item.trip.id,
                label: several ? `Trip ${index + 1}` : null,
                detail: quote ? (
                  <>
                    {placesLine(quote)}
                    <span className="block">{quote.startsAt}</span>
                    <span className="block">
                      {chosen
                        ? vehicleLine(shared ? trips : [item.trip], vehicle, {
                            price: false,
                          })
                        : "No vehicle yet"}
                    </span>
                  </>
                ) : (
                  "Not priced yet"
                ),
                lines: tripPriceLines(
                  item.trip,
                  chosen,
                  item.details.guide.language,
                ),
                agreedPrice: item.trip.agreedPrice,
                priceReason: item.trip.priceReason,
              };
            })}
            onPriceChange={(id, patch) => patchTrip(id, patch)}
            canPrice
            submit={
              <>
                <NewBookingChoice
                  agentId={agentId}
                  totalSen={totalSen}
                  confirm={confirmNow}
                  onConfirm={setConfirmNow}
                />
                <Button
                  type="submit"
                  disabled={missing !== null}
                  pending={create.pending}
                  className="mt-1"
                >
                  {create.pending
                    ? "Creating…"
                    : confirmNow
                      ? "Create and confirm"
                      : "Save for later"}
                </Button>
              </>
            }
            missing={missing}
            error={create.error}
            cancelHref={bookingsHref(scope)}
          />
        </aside>
      </div>
      {confirmDialog}
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
      <Field label="Customer name" className="sm:col-span-2">
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
