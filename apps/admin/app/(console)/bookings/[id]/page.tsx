import Link from "next/link";
import {
  ADVANCE_PERMISSIONS,
  BOOKING_STATUS_LABELS,
  customerEmailOf,
  formatLocalDateTime,
  formatMyr,
  fullName,
  isBookingStatus,
  isTripPriceBreakdown,
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
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import { PlaceValue, Rows } from "../../../_components/Rows";
import {
  BookingStatusBadge,
  ItemStatusBadge,
} from "../../../_components/StatusBadges";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { amendItemHref, BOOKINGS_PATH } from "../../../_lib/routes";
import { CancelBookingControl, ItemControls } from "./BookingControls";
import { Notes } from "./Notes";
import { PriceOverrideControl } from "./PriceOverride";

function statusLabel(status: string) {
  return isBookingStatus(status) ? BOOKING_STATUS_LABELS[status] : status;
}

/**
 * Route: /bookings/[id]. One booking for ops: each item with its trip,
 * price and controls on the left; the customer, the totals, the
 * booking-level cancel, the internal notes and the history on the right.
 * Every team opens it; the controls follow what the admin may do.
 */
export default async function BookingPage({
  params,
}: PageProps<"/bookings/[id]">) {
  await requireAdmin("bookings.view");
  const { id } = await params;
  const [booking, permissions, history, notes] = await Promise.all([
    getBooking(id),
    getPermissions(),
    listActivityFor("booking", id),
    listBookingNotes(id),
  ]);
  if (!booking) notFound();
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
  // The account the booking shows under, when there is one: a guest
  // entered by staff has none.
  customer.push([
    "Account",
    booking.user ? (
      fullName(booking.user) || booking.user.email
    ) : (
      <span key="a" className="font-normal text-neutral-500">
        None, entered by staff
      </span>
    ),
  ]);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={BOOKINGS_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All bookings
        </Link>
      </p>
      <PageHeader
        title={booking.reference}
        description={`${statusLabel(booking.status)}. Pick-up ${formatLocalDateTime(booking.startsAt)}.`}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-6">
          {booking.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              label={`${booking.reference} item ${item.position}`}
              showPosition={booking.items.length > 1}
              permissions={permissions}
            />
          ))}
        </div>

        <div className="grid gap-6">
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
        </div>
      </div>
    </>
  );
}

function ItemCard({
  item,
  label,
  showPosition,
  permissions,
}: {
  item: BookingItemWithDetails;
  label: string;
  showPosition: boolean;
  permissions: readonly Permission[];
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

  // The receipt, then the agreed price when one replaces it. The receipt's
  // total stays on record next to what is charged.
  const receipt = isTripPriceBreakdown(item.priceBreakdown)
    ? item.priceBreakdown
    : null;
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
          <h2 className="text-base font-semibold tracking-tight">
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
          amendHref={canAmend ? amendItemHref(item.bookingId, item.id) : null}
        />
      </div>
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
