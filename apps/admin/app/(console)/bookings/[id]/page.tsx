import Link from "next/link";
import {
  BOOKING_STATUS_LABELS,
  carDetailRows,
  formatLocalDateTime,
  formatMyr,
  fullName,
  isBookingStatus,
  isCarPriceBreakdown,
  priceRows,
  tripRows,
  tripViewOfItem,
} from "@repo/db";
import { getBooking, type BookingItemWithDetails } from "@repo/db/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { PlaceValue, Rows } from "../../../_components/Rows";
import {
  BookingStatusBadge,
  ItemStatusBadge,
} from "../../../_components/StatusBadges";
import { requireAdmin } from "../../../_lib/access";
import { BOOKINGS_PATH } from "../../../_lib/routes";
import { CancelBookingControl, ItemControls } from "./BookingControls";

const PRODUCT_NAMES: Record<string, string> = {
  "car-with-driver": "Car with driver",
};

function statusLabel(status: string) {
  return isBookingStatus(status) ? BOOKING_STATUS_LABELS[status] : status;
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      {children}
    </section>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-base font-semibold tracking-tight">{children}</h2>
  );
}

/**
 * Route: /bookings/[id]. One booking for ops: each item with its trip,
 * price and controls on the left; the customer, the totals and the
 * booking-level cancel on the right. All admin levels.
 */
export default async function BookingPage({
  params,
}: PageProps<"/bookings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

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

  const accountName = fullName(booking.user);
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
      <a
        key="e"
        href={`mailto:${booking.user.email}`}
        className="break-all hover:underline"
      >
        {booking.user.email}
      </a>,
    ],
  ];
  if (accountName && accountName !== booking.contactName) {
    customer.push(["Account", accountName]);
  }

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
            />
          ))}
        </div>

        <div className="grid gap-6">
          <Card>
            <CardTitle>Booking</CardTitle>
            <Rows rows={summary} />
            {open ? (
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
        </div>
      </div>
    </>
  );
}

function ItemCard({
  item,
  label,
  showPosition,
}: {
  item: BookingItemWithDetails;
  label: string;
  showPosition: boolean;
}) {
  const trip = tripViewOfItem(item);
  const productName = PRODUCT_NAMES[item.product] ?? item.product;
  const rows: [string, ReactNode][] = trip
    ? tripRows(trip).map(([rowLabel, value]) => [
        rowLabel,
        typeof value === "string" ? value : <PlaceValue place={value} />,
      ])
    : [["Pick-up time", formatLocalDateTime(item.startsAt)]];
  if (item.carDetails) rows.push(...carDetailRows(item.carDetails));
  if (item.zone) rows.push(["Zone", item.zone.name]);

  const price: [string, ReactNode][] = isCarPriceBreakdown(item.priceBreakdown)
    ? priceRows(item.priceBreakdown)
    : [];
  price.push([
    "Total",
    <strong key="t">{formatMyr(item.priceTotalSen)}</strong>,
  ]);

  const history: [string, ReactNode][] = [
    ["Received", formatLocalDateTime(item.createdAt)],
  ];
  if (item.confirmedAt) {
    history.push(["Confirmed", formatLocalDateTime(item.confirmedAt)]);
  }
  if (item.cancelledAt) {
    history.push(["Cancelled", formatLocalDateTime(item.cancelledAt)]);
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">
            {showPosition ? `Item ${item.position}: ` : ""}
            {productName}
          </h2>
          <ItemStatusBadge status={item.status} />
        </div>
        <ItemControls itemId={item.id} status={item.status} label={label} />
      </div>
      <Rows rows={rows} />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Price
          </h3>
          <Rows rows={price} />
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            History
          </h3>
          <Rows rows={history} />
        </div>
      </div>
    </Card>
  );
}
