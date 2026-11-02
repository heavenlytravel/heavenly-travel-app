import {
  ADVANCE_PERMISSIONS,
  customerEmailOf,
  formatLocalDateTime,
  formatMyr,
  fullName,
  itemHeading,
  ITEM_STATUS_LABELS,
  nextItemStatusOf,
  phoneHrefOf,
  priceBreakdownOf,
  priceRows,
  TRIP_MODE_LABELS,
  tripDetailRows,
  tripViewOfItem,
  whatsappHrefOf,
  type ItemStatus,
  type Permission,
  type Place,
} from "@repo/db";
import {
  getBookingFulfilment,
  listActivityFor,
  listBookingNotes,
  listTripEvents,
  type ActivityEntry,
  type BookingItemWithDetails,
  type BookingWithItems,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { CheckIcon, MessageCircleIcon, PhoneIcon } from "@repo/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { Notice } from "@repo/ui/notice";
import { placeAddress, Rows } from "@repo/ui/rows";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  HeaderSkeleton,
} from "@repo/console/Skeleton";
import {
  BookingStatusBadge,
  ItemStatusBadge,
} from "@repo/console/StatusBadges";
import {
  HistoryCard,
  HistoryLink,
} from "../../../../_components/RecordHistory";
import { getPermissions } from "../../../../_lib/access";
import { bookingLocations } from "../../../../_lib/booking-locations";
import {
  amendItemHref,
  bookingHref,
  recordHistoryHref,
  type ScopeSlug,
} from "../../../../_lib/routes";
import type { ConsoleScope } from "../../../../_lib/scope";
import { scopedBooking } from "../_lib/scoped-booking";
import { CancelBookingControl, ItemActions } from "./BookingControls";
import { Notes } from "./Notes";
import { TripReports } from "./TripReports";
import { WhoDoesIt } from "./WhoDoesIt";

/** What stands where the booking is loading: its header and its two columns of cards. */
export function BookingSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <DetailSkeleton
        main={<CardSkeleton rows={9} />}
        side={
          <>
            <CardSkeleton rows={4} />
            <CardSkeleton rows={4} />
            <CardSkeleton rows={3} />
          </>
        }
      />
    </>
  );
}

/**
 * Who made the booking and when, and where its trips pick up: "Booked on
 * the website by Aznan Medina, Sat, 3 Oct 2026, 11:42 AM · Langkawi". The
 * log's first entry says who; a booking older than the log says when
 * alone.
 */
function bookedLine(
  booking: BookingWithItems,
  entries: readonly ActivityEntry[],
) {
  const made = entries.find((entry) => entry.action === "booking.created");
  const by = !made
    ? "Booked"
    : made.actorKind === "admin"
      ? `Entered by ${made.actorName}`
      : `Booked on the website by ${
          made.actorKind === "customer" ? made.actorName : booking.contactName
        }`;
  const where = bookingLocations(booking)
    .map((location) => location.name)
    .join(", ");
  return [`${by}, ${formatLocalDateTime(booking.createdAt)}`, where]
    .filter(Boolean)
    .join(" · ");
}

/**
 * One booking for ops, under its reference: who made it, when and where,
 * then who does its trips and what its drivers reported, then a card per
 * trip with its steps, its stops and details, its price
 * and what may be done to it; beside them the booking's summary, the
 * customer, the staff's notes and the last of its history. "History" and
 * "Cancel booking" stand in the header. Every team opens it; the controls
 * follow what the admin may do. It opens under `~` and under any location
 * a trip picks up in; under another location it is not found.
 */
export async function bookingScreen({
  id,
  scope,
}: {
  id: string;
  scope: ConsoleScope;
}) {
  const [booking, permissions, notes, entries, fulfilment] = await Promise.all([
    scopedBooking(id, scope),
    getPermissions(),
    listBookingNotes(id),
    listActivityFor("booking", id),
    getBookingFulfilment(id),
  ]);
  const events = await listTripEvents(fulfilment.map((trip) => trip.id));
  const canFulfil = permissions.includes("bookings.fulfil");
  const href = bookingHref(scope.slug, booking.id);
  const open = booking.status !== "cancelled" && booking.status !== "completed";

  const summary: [string, ReactNode][] = [
    ["Status", <BookingStatusBadge key="s" status={booking.status} />],
    ["Trips", String(booking.items.length)],
    ["Booked", formatLocalDateTime(booking.createdAt)],
  ];
  if (booking.confirmedAt) {
    summary.push(["Confirmed", formatLocalDateTime(booking.confirmedAt)]);
  }
  if (booking.cancelledAt) {
    summary.push([
      "Cancelled",
      `${formatLocalDateTime(booking.cancelledAt)}${
        booking.cancelledBy ? ` by ${booking.cancelledBy}` : ""
      }`,
    ]);
  }
  summary.push([
    "Total",
    <strong key="t" className="font-bold text-ink">
      {formatMyr(booking.priceTotalSen)}
    </strong>,
  ]);

  return (
    <>
      <PageHeader
        title={booking.reference}
        badge={<BookingStatusBadge status={booking.status} />}
        meta={bookedLine(booking, entries)}
        action={
          <>
            <HistoryLink href={recordHistoryHref(href)} />
            {open && permissions.includes("bookings.manage") ? (
              <CancelBookingControl
                bookingId={booking.id}
                reference={booking.reference}
              />
            ) : null}
          </>
        }
      />

      <DetailColumns
        main={
          <>
            <WhoDoesIt
              bookingId={booking.id}
              trips={fulfilment}
              canFulfil={canFulfil}
            />
            <TripReports
              bookingId={booking.id}
              trips={fulfilment}
              events={events}
              canFulfil={canFulfil}
            />
            {booking.items.map((item) => (
              <TripCard
                key={item.id}
                item={item}
                reference={booking.reference}
                permissions={permissions}
                scope={scope.slug}
              />
            ))}
          </>
        }
        side={
          <>
            <Card>
              <CardTitle>Booking</CardTitle>
              <Rows rows={summary} className="text-sm" />
            </Card>
            <CustomerCard booking={booking} />
            {permissions.includes("bookings.notes") ? (
              <Card>
                <CardTitle meta="Staff only">Notes</CardTitle>
                <Notes bookingId={booking.id} notes={notes} />
              </Card>
            ) : null}
            <HistoryCard href={recordHistoryHref(href)} entries={entries} />
          </>
        }
      />
    </>
  );
}

/** Who the booking is for, with the ways to reach them: a call, WhatsApp and the email. */
function CustomerCard({ booking }: { booking: BookingWithItems }) {
  const email = customerEmailOf(booking);
  const phone = booking.contactPhone;
  const call = phoneHrefOf(phone) ?? `tel:${phone}`;
  const whatsapp = whatsappHrefOf(phone);
  // The account the booking shows under, when there is one. A guest has
  // none, whether they booked on the website or staff entered it; the
  // activity log says which.
  const rows: [string, ReactNode][] = [
    ["Name", booking.contactName],
    [
      "Phone",
      <a key="p" href={call} className="hover:underline">
        {phone}
      </a>,
    ],
    [
      "Email",
      email ? (
        <a
          key="e"
          href={`mailto:${email}`}
          className="break-all hover:underline"
        >
          {email}
        </a>
      ) : (
        <span key="e" className="font-normal text-muted">
          None given, no emails sent
        </span>
      ),
    ],
    [
      "Account",
      booking.user ? (
        // A long email breaks where it must, not past the card.
        <span key="a" className="[overflow-wrap:anywhere]">
          {fullName(booking.user) || booking.user.email}
        </span>
      ) : (
        <span key="a" className="font-normal text-muted">
          None, booked as a guest
        </span>
      ),
    ],
  ];
  return (
    <Card>
      <CardTitle meta={booking.user ? "Account" : "Guest"}>Customer</CardTitle>
      <Rows rows={rows} className="text-sm" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <a href={call}>
            <PhoneIcon className="size-4" />
            Call
          </a>
        </Button>
        {whatsapp ? (
          <Button asChild variant="secondary" size="sm">
            <a href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircleIcon className="size-4" />
              WhatsApp
            </a>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/** One trip of a booking: its title and status, its steps, its stops and details, its price and its actions. */
function TripCard({
  item,
  reference,
  permissions,
  scope,
}: {
  item: BookingItemWithDetails;
  reference: string;
  permissions: readonly Permission[];
  scope: ScopeSlug;
}) {
  const next = nextItemStatusOf(item.status);
  const trip = tripViewOfItem(item);
  const details = item.tripDetails;

  const rows: [string, ReactNode][] = details
    ? tripDetailRows(details).filter(([label]) => label !== "Vehicle")
    : [];
  if (!trip) rows.unshift(["Pick-up time", formatLocalDateTime(item.startsAt)]);
  if (item.district) {
    rows.push([
      "District",
      `${item.district.name}, ${item.district.state.name}`,
    ]);
  }
  if (item.location) {
    // Under every location, the way to the same booking inside its location.
    rows.push([
      "Location",
      scope ? (
        item.location.name
      ) : (
        <Link
          key="l"
          href={bookingHref(item.location.slug, item.bookingId)}
          className="rounded-sm underline decoration-edge underline-offset-4 hover:decoration-ink focus-ring"
        >
          {item.location.name}
        </Link>
      ),
    ]);
  }

  // The receipt, then the agreed price when one replaces it. The receipt's
  // total stays on record next to what is charged.
  const receipt = priceBreakdownOf(item.priceBreakdown);
  const override =
    item.priceOverrideSen !== null && item.priceOverrideReason !== null
      ? { totalSen: item.priceOverrideSen, reason: item.priceOverrideReason }
      : null;
  const price: [string, ReactNode][] = receipt ? priceRows(receipt) : [];
  if (override) {
    if (receipt) price.push(["Quoted price", formatMyr(receipt.totalSen)]);
    price.push([
      "Agreed price",
      <span key="o">
        <span className="block">{formatMyr(override.totalSen)}</span>
        <span className="block text-xs font-normal text-muted">
          {override.reason}
        </span>
      </span>,
    ]);
  }
  price.push([
    "Total",
    <strong key="t" className="font-bold text-ink">
      {formatMyr(item.priceTotalSen)}
    </strong>,
  ]);
  const canPrice =
    permissions.includes("bookings.create") &&
    item.status !== "cancelled" &&
    item.status !== "completed";
  // A trip can be amended until it is assigned; amending a trip with a
  // vehicle or driver asked for lets them go, to ask again.
  const canAmend =
    permissions.includes("bookings.manage") &&
    trip !== null &&
    (item.status === "received" || item.status === "confirmed");

  return (
    <Card flush>
      <CardTitle
        inset
        meta={[itemHeading(item), details?.vehicleClassName]
          .filter(Boolean)
          .join(" · ")}
        action={<ItemStatusBadge status={item.status} />}
      >
        {`Trip ${item.position}${trip ? ` · ${TRIP_MODE_LABELS[trip.mode]}` : ""}`}
      </CardTitle>
      <TripSteps item={item} />
      <div className="grid gap-5 p-5">
        {/* The customer paid for this model: kept by people until assignment checks it. */}
        {details?.vehicleModelName &&
        (item.status === "received" || item.status === "confirmed") ? (
          <Notice>
            The customer paid to choose the {details.vehicleModelName}. Send
            one. If none is free, call them before sending another vehicle.
          </Notice>
        ) : null}
        {trip ? (
          <ol className="grid gap-4">
            <Stop
              place={trip.pickup}
              first
              last={!trip.dropoff}
              line={[
                formatLocalDateTime(trip.startsAt),
                trip.hours !== null ? `${trip.hours} hours` : null,
              ]}
            />
            {trip.dropoff ? (
              <Stop
                place={trip.dropoff}
                first={false}
                last
                line={[
                  trip.distanceKm !== null
                    ? `${trip.distanceKm.toFixed(1)} km by road`
                    : null,
                ]}
              />
            ) : null}
          </ol>
        ) : null}
        {rows.length > 0 ? <Rows rows={rows} className="text-sm" /> : null}
        <div className="border-t border-hairline pt-2">
          <Rows rows={price} className="text-sm" />
        </div>
      </div>
      <ItemActions
        itemId={item.id}
        status={item.status}
        label={`${reference} trip ${item.position}`}
        canAdvance={
          next !== null && permissions.includes(ADVANCE_PERMISSIONS[next])
        }
        canCancel={permissions.includes("bookings.manage")}
        amendHref={
          canAmend ? amendItemHref(scope, item.bookingId, item.id) : null
        }
        price={canPrice ? { current: override } : undefined}
      />
    </Card>
  );
}

/** A trip's stop, on the line from the pick-up to the drop-off: the place, its address, then the time or the distance. */
function Stop({
  place,
  first,
  last,
  line,
}: {
  place: Place;
  first: boolean;
  last: boolean;
  line: (string | null)[];
}) {
  const facts = [placeAddress(place), ...line].filter(Boolean).join(" · ");
  return (
    <li className="relative grid grid-cols-[1.25rem_1fr] gap-3">
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute top-4 bottom-[-1.25rem] left-[0.5625rem] w-px bg-slot"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cx(
          "relative mt-1 size-3 rounded-full",
          first ? "border-[3px] border-brand bg-white" : "bg-brand",
        )}
      />
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{place.label}</span>
        {facts ? (
          <span className="block text-caption text-muted">{facts}</span>
        ) : null}
      </span>
    </li>
  );
}

/** The steps a trip goes through, in order. */
const TRIP_STEPS = [
  "received",
  "confirmed",
  "assigned",
  "completed",
] as const satisfies readonly ItemStatus[];

/**
 * The trip's steps from its own status: those reached ticked, the next
 * one ringed, as it waits for staff, with the time of those the trip
 * records. A cancelled trip says so, and when, instead. In a line from
 * `sm` up; two by two on a phone, where a line would not fit.
 */
function TripSteps({ item }: { item: BookingItemWithDetails }) {
  if (item.status === "cancelled") {
    return (
      <p className="border-b border-hairline px-5 py-3 text-sm text-muted">
        {ITEM_STATUS_LABELS.cancelled}
        {item.cancelledAt ? ` ${formatLocalDateTime(item.cancelledAt)}` : ""}
      </p>
    );
  }
  const reached = TRIP_STEPS.findIndex((step) => step === item.status);
  const timeOf = (step: (typeof TRIP_STEPS)[number]) =>
    step === "received"
      ? item.createdAt
      : step === "confirmed"
        ? item.confirmedAt
        : null;
  return (
    // From `sm`, one row of four that always fits the card: the first three
    // share the room, each with its line on to the next, and the last takes
    // its own width. A time wraps under its step rather than widen it.
    <ol
      aria-label="Steps"
      className="grid grid-cols-2 gap-3 border-b border-hairline px-5 py-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:gap-x-2"
    >
      {TRIP_STEPS.map((step, index) => {
        const done = index <= reached;
        const nextUp = index === reached + 1;
        const at = done ? timeOf(step) : null;
        return (
          <li
            key={step}
            aria-current={index === reached ? "step" : undefined}
            className="flex min-w-0 items-start gap-2"
          >
            <span
              aria-hidden="true"
              className={cx(
                "mt-px grid size-4 shrink-0 place-items-center rounded-full",
                done
                  ? "bg-brand text-white"
                  : nextUp
                    ? "border-2 border-warning"
                    : "border-2 border-edge",
              )}
            >
              {done ? <CheckIcon className="size-2.5" /> : null}
            </span>
            <span className="grid min-w-0">
              <span
                className={cx(
                  "text-caption whitespace-nowrap",
                  done ? "font-semibold text-ink" : "text-muted",
                )}
              >
                {ITEM_STATUS_LABELS[step]}
              </span>
              {at ? (
                <span className="text-2xs text-muted">
                  {formatLocalDateTime(at)}
                </span>
              ) : null}
            </span>
            {index < TRIP_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className="mt-2 h-px min-w-4 flex-1 bg-hairline max-sm:hidden"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
