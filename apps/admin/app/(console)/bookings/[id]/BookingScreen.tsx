import {
  ADVANCE_PERMISSIONS,
  BOOKING_STATUS_LABELS,
  customerEmailOf,
  formatLocalDateTime,
  formatMyr,
  fullName,
  isBookingStatus,
  priceBreakdownOf,
  itemHeading,
  nextItemStatusOf,
  priceRows,
  tripDetailRows,
  tripRows,
  tripViewOfItem,
  type Permission,
} from "@repo/db";
import {
  getBooking,
  listActivityFor,
  listBookingNotes,
  type BookingItemWithDetails,
} from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { DetailColumns } from "../../../_components/PageColumn";
import { PageHeader } from "../../../_components/PageHeader";
import { SectionHeader } from "../../../_components/SectionHeader";
import { PlaceValue, Rows } from "../../../_components/Rows";
import { Card, CardTitle } from "../../../_components/Card";
import {
  DetailSkeleton,
  HeaderSkeleton,
  CardSkeleton,
} from "../../../_components/Skeleton";
import {
  BookingStatusBadge,
  ItemStatusBadge,
} from "../../../_components/StatusBadges";
import { getPermissions } from "../../../_lib/access";
import { amendItemHref, bookingHref } from "../../../_lib/routes";
import { CancelBookingControl, ItemControls } from "./BookingControls";
import { Notes } from "./Notes";
import { PriceOverrideControl } from "./PriceOverride";

function statusLabel(status: string) {
  return isBookingStatus(status) ? BOOKING_STATUS_LABELS[status] : status;
}

/**
 * The location a booking is opened inside, by its id and its slug; null
 * from the queue across locations.
 */
export type BookingPlace = { id: string; slug: string } | null;

/** What stands where the booking is loading: its header and its two columns of cards. */
export function BookingSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <DetailSkeleton
        main={<CardSkeleton rows={9} />}
        side={
          <>
            <CardSkeleton rows={3} />
            <CardSkeleton rows={4} />
            <CardSkeleton rows={3} />
          </>
        }
      />
    </>
  );
}

/**
 * One booking for ops, under its reference: each item with its trip,
 * price and controls on the left; the customer, the totals, the
 * booking-level cancel, the internal notes and the history on the right.
 * Every team opens it; the controls follow what the admin may do. From
 * the queue it is the page's own header; inside a location, under the
 * location's header, it is a section of that page, and its links stay in
 * the location. A booking with no item picking up in that location opens
 * from the queue instead.
 */
export async function bookingScreen({
  id,
  place,
}: {
  id: string;
  place: BookingPlace;
}) {
  const [booking, permissions, history, notes] = await Promise.all([
    getBooking(id),
    getPermissions(),
    listActivityFor("booking", id),
    listBookingNotes(id),
  ]);
  if (!booking) notFound();
  if (place && !booking.items.some((item) => item.locationId === place.id)) {
    redirect(bookingHref(booking.id));
  }
  const Header = place ? SectionHeader : PageHeader;
  const canManage = permissions.includes("bookings.manage");

  const open = booking.status !== "cancelled" && booking.status !== "completed";

  const summary: [string, ReactNode][] = [
    ["Status", <BookingStatusBadge key="s" status={booking.status} />],
    ["Total", <strong key="t">{formatMyr(booking.priceTotalSen)}</strong>],
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

  const email = customerEmailOf(booking);
  const customer: [string, ReactNode][] = [
    ["Name", booking.contactName],
    [
      "Phone",
      <a
        key="p"
        href={`tel:${booking.contactPhone}`}
        className="hover:underline"
      >
        {booking.contactPhone}
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
        <span key="e" className="font-normal text-neutral-500">
          None given, no emails sent
        </span>
      ),
    ],
  ];
  // The account the booking shows under, when there is one. A guest has
  // none, whether they booked on the website or staff entered it; the
  // activity log says which.
  customer.push([
    "Account",
    booking.user ? (
      fullName(booking.user) || booking.user.email
    ) : (
      <span key="a" className="font-normal text-neutral-500">
        None, booked as a guest
      </span>
    ),
  ]);

  return (
    <>
      <Header
        title={booking.reference}
        description={`${statusLabel(booking.status)}. Pick-up ${formatLocalDateTime(booking.startsAt)}.`}
      />

      <DetailColumns
        main={booking.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            label={`${booking.reference} item ${item.position}`}
            showPosition={booking.items.length > 1}
            permissions={permissions}
            slug={place?.slug}
          />
        ))}
        side={
          <>
            <Card>
              <CardTitle>Booking</CardTitle>
              <Rows rows={summary} />
              {open && canManage ? (
                <div className="mt-4">
                  <CancelBookingControl
                    bookingId={booking.id}
                    reference={booking.reference}
                  />
                </div>
              ) : null}
            </Card>
            <Card>
              <CardTitle>Customer</CardTitle>
              <Rows rows={customer} />
            </Card>
            {permissions.includes("bookings.notes") ? (
              <Card>
                <CardTitle>Notes</CardTitle>
                <Notes bookingId={booking.id} notes={notes} />
              </Card>
            ) : null}
            <Card>
              <CardTitle>History</CardTitle>
              <ActivityHistory
                entries={history}
                emptyMessage="No activity recorded. This booking predates the log."
              />
            </Card>
          </>
        }
      />
    </>
  );
}

function ItemCard({
  item,
  label,
  showPosition,
  permissions,
  slug,
}: {
  item: BookingItemWithDetails;
  label: string;
  showPosition: boolean;
  permissions: readonly Permission[];
  /** The location the booking is opened inside, for the amend link. */
  slug: string | undefined;
}) {
  const next = nextItemStatusOf(item.status);
  const trip = tripViewOfItem(item);
  const rows: [string, ReactNode][] = trip
    ? tripRows(trip).map(([rowLabel, value]) => [
        rowLabel,
        typeof value === "string" ? value : <PlaceValue place={value} />,
      ])
    : [["Pick-up time", formatLocalDateTime(item.startsAt)]];
  if (item.tripDetails) rows.push(...tripDetailRows(item.tripDetails));
  if (item.district) {
    rows.push([
      "District",
      `${item.district.name}, ${item.district.state.name}`,
    ]);
  }
  if (item.location) rows.push(["Location", item.location.name]);

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
        <span className="block text-xs font-normal text-neutral-500">
          {override.reason}
        </span>
      </span>,
    ]);
  }
  price.push([
    "Total",
    <strong key="t">{formatMyr(item.priceTotalSen)}</strong>,
  ]);
  const canPrice =
    permissions.includes("bookings.create") &&
    item.status !== "cancelled" &&
    item.status !== "completed";
  // A trip can be amended until a driver is assigned to it.
  const canAmend =
    permissions.includes("bookings.manage") &&
    trip !== null &&
    (item.status === "received" || item.status === "confirmed");

  const dates: [string, ReactNode][] = [
    ["Received", formatLocalDateTime(item.createdAt)],
  ];
  if (item.confirmedAt) {
    dates.push(["Confirmed", formatLocalDateTime(item.confirmedAt)]);
  }
  if (item.cancelledAt) {
    dates.push(["Cancelled", formatLocalDateTime(item.cancelledAt)]);
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {showPosition ? `Item ${item.position}: ` : ""}
            {itemHeading(item)}
          </h2>
          <ItemStatusBadge status={item.status} />
        </div>
        <ItemControls
          itemId={item.id}
          status={item.status}
          label={label}
          canAdvance={
            next !== null && permissions.includes(ADVANCE_PERMISSIONS[next])
          }
          canCancel={permissions.includes("bookings.manage")}
          amendHref={
            canAmend ? amendItemHref(item.bookingId, item.id, slug) : null
          }
        />
      </div>
      {/* The customer paid for this model: kept by people until assignment checks it. */}
      {item.tripDetails?.vehicleModelName &&
      (item.status === "received" || item.status === "confirmed") ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The customer paid to choose the {item.tripDetails.vehicleModelName}.
          Send one. If none is free, call them before sending another vehicle.
        </p>
      ) : null}
      <Rows rows={rows} />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Price
          </h3>
          <Rows rows={price} />
          {canPrice ? (
            <div className="mt-3">
              <PriceOverrideControl itemId={item.id} current={override} />
            </div>
          ) : null}
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Dates
          </h3>
          <Rows rows={dates} />
        </div>
      </div>
    </Card>
  );
}
