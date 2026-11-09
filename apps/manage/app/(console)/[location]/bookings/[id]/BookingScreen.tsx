import {
  ADVANCE_PERMISSIONS,
  AMEND_WARNING_TEXT,
  BOOKING_RULES,
  bookingLabelOf,
  customerEmailOf,
  entriesSeenBy,
  formatLocalDate,
  formatLocalDateTime,
  formatMyr,
  fullName,
  isRevisionKind,
  itemHeading,
  itemQuoteSen,
  ITEM_STATUS_LABELS,
  nextItemStatusOf,
  phoneHrefOf,
  priceBreakdownOf,
  priceRows,
  REVISION_KIND_LABELS,
  stopsOf,
  TRIP_MODE_LABELS,
  tripDetailRows,
  tripHeadline,
  tripViewOfItem,
  whatsappHrefOf,
  type AmendWarning,
  type ItemStatus,
  type Permission,
  type Place,
} from "@repo/db";
import {
  billingPreviewOf,
  bookingBillingOf,
  getBookingFulfilment,
  isAmendable,
  listActivityFor,
  listAgents,
  listBookingNotes,
  listRevisions,
  listTripEvents,
  type ActivityEntry,
  type BookingBilling,
  type BookingItemWithDetails,
  type BookingWithItems,
} from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { CheckIcon, MessageCircleIcon, PhoneIcon } from "@repo/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardRow, CardRows, CardTitle } from "@repo/console/Card";
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
  PaymentStateBadge,
} from "@repo/console/StatusBadges";
import { DocumentStateBadge } from "../../../../_components/InvoiceTable";
import {
  HistoryCard,
  HistoryLink,
} from "../../../../_components/RecordHistory";
import { getPermissions } from "../../../../_lib/access";
import { bookingLocations } from "../../../../_lib/booking-locations";
import {
  addTripHref,
  agentHref,
  amendItemHref,
  bookingHref,
  invoiceHref,
  recordHistoryHref,
  revisionHref,
  type ScopeSlug,
} from "../../../../_lib/routes";
import type { ConsoleScope } from "../../../../_lib/scope";
import { scopedBooking } from "../_lib/scoped-booking";
import { BillAloneControl } from "../../agents/_components/AgentControls";
import { ItemActions } from "./BookingControls";
import { BookingAgentControl, LegacyInvoiceControl } from "./BillingControls";
import { ChangeBookingMenu, type ChangeTrip } from "./ChangeBooking";
import { Notes } from "./Notes";
import { TripReports } from "../../assign/TripReports";
import { WhoDoesIt } from "./WhoDoesIt";
import { EditContactControl } from "./EditContact";

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
 * the website by Aznan Medina, Sat, 3 Oct 2026, 11:42 · Langkawi". The
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
 * One booking for ops, under its number (HTB-1042): who made it, when and
 * where, then who does its trips and what its drivers reported, then a
 * card per trip with its steps, its stops and details and its price, and
 * the booking's revisions; beside them the booking's summary, its
 * billing, the customer, the staff's notes and the last of its history.
 * "History" and "Change booking" stand in the header; every change is
 * made there, and says what it bills before it is saved. After an amend
 * that no longer fits what is assigned, the page says so (`warn`). Every
 * team opens it; the controls follow what the admin may do. It opens
 * under `~` and under any location a trip picks up in; under another
 * location it is not found.
 */
export async function bookingScreen({
  id,
  scope,
  warn = [],
}: {
  id: string;
  scope: ConsoleScope;
  warn?: readonly AmendWarning[];
}) {
  const [booking, permissions, notes, entries, fulfilment, billing, revisions] =
    await Promise.all([
      scopedBooking(id, scope),
      getPermissions(),
      listBookingNotes(id),
      listActivityFor("booking", id),
      getBookingFulfilment(id),
      bookingBillingOf(id),
      listRevisions(id),
    ]);
  const [events, agents, confirming] = await Promise.all([
    listTripEvents(fulfilment.map((trip) => trip.id)),
    permissions.includes("bookings.manage")
      ? listAgents()
      : Promise.resolve([]),
    booking.status === "received"
      ? billingPreviewOf(id, booking.priceTotalSen, { confirms: true })
      : Promise.resolve(null),
  ]);
  const canFulfil = permissions.includes("bookings.fulfil");
  const href = bookingHref(scope.slug, booking.id);
  const label = bookingLabelOf(booking);
  const manage = permissions.includes("bookings.manage");
  const cancelled = booking.status === "cancelled";

  const summary: [string, ReactNode][] = [
    ["Status", <BookingStatusBadge key="s" status={booking.status} />],
    ["Trips", String(booking.items.length)],
    ["Booked", formatLocalDateTime(booking.createdAt)],
    [
      "Agent",
      <span key="a" className="flex flex-wrap items-center justify-end gap-x-2">
        {booking.business ? (
          <Link
            href={agentHref(booking.business.id)}
            className="hover:underline"
          >
            {booking.business.name}
          </Link>
        ) : (
          <span className="font-normal text-muted">None</span>
        )}
        {manage && !cancelled ? (
          <BookingAgentControl
            bookingId={booking.id}
            agentId={booking.business?.id ?? null}
            agents={agents}
          />
        ) : null}
      </span>,
    ],
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
  for (const charge of booking.charges.filter((c) => c.itemId === null)) {
    summary.push([charge.label, formatMyr(charge.amountSen)]);
  }
  summary.push([
    "Total",
    <strong key="t" className="font-bold text-ink">
      {formatMyr(booking.priceTotalSen)}
    </strong>,
  ]);

  const trips: ChangeTrip[] = booking.items.map((item) => {
    const view = tripViewOfItem(item);
    return {
      id: item.id,
      position: item.position,
      headline: view ? tripHeadline(view) : itemHeading(item),
      priceSen: item.priceTotalSen,
      stops: stopsOf(item.tripDetails?.stops).map((s) => s.place.label),
      amendHref:
        manage && view !== null && isAmendable(item)
          ? amendItemHref(scope.slug, booking.id, item.id)
          : null,
      open: isAmendable(item),
      live: item.status !== "cancelled",
    };
  });
  const keptOnCancelSen =
    booking.items
      .filter((item) => item.status === "completed")
      .reduce((sum, item) => sum + item.priceTotalSen, 0) +
    booking.charges.reduce((sum, c) => sum + c.amountSen, 0);

  return (
    <>
      <PageHeader
        title={label}
        badge={<BookingStatusBadge status={booking.status} />}
        meta={bookedLine(booking, entries)}
        action={
          <>
            <HistoryLink href={recordHistoryHref(href)} />
            {cancelled ? null : (
              <ChangeBookingMenu
                bookingId={booking.id}
                label={label}
                chargedSen={booking.priceTotalSen}
                keptOnCancelSen={keptOnCancelSen}
                trips={trips}
                addTripHref={
                  manage &&
                  booking.items.length < BOOKING_RULES.maxTripsPerBooking
                    ? addTripHref(scope.slug, booking.id)
                    : null
                }
                rights={{
                  manage,
                  price: permissions.includes("bookings.create"),
                  extras: manage || canFulfil,
                }}
                cancellable={booking.status !== "completed"}
              />
            )}
          </>
        }
      />

      {warn.length > 0 ? (
        <Notice className="mb-5">
          <span className="block font-semibold">
            The vehicle and the driver stay on the trip.
          </span>
          {warn.map((w) => (
            <span key={w} className="block">
              {AMEND_WARNING_TEXT[w]}
            </span>
          ))}
        </Notice>
      ) : null}

      <DetailColumns
        main={
          <>
            <WhoDoesIt
              bookingId={booking.id}
              trips={fulfilment}
              canFulfil={canFulfil}
              scope={scope.slug}
            />
            {/* To read here: Operation reports for a driver under Assign. */}
            <TripReports
              bookingId={booking.id}
              trips={fulfilment}
              events={events}
              canFulfil={false}
            />
            {booking.items.map((item) => (
              <TripCard
                key={item.id}
                item={item}
                charges={booking.charges.filter((c) => c.itemId === item.id)}
                permissions={permissions}
                scope={scope.slug}
                confirmBills={confirming?.sentence ?? null}
              />
            ))}
            <RevisionsCard
              scope={scope.slug}
              bookingId={booking.id}
              revisions={revisions}
            />
          </>
        }
        side={
          <>
            <Card>
              <CardTitle>Booking</CardTitle>
              <Rows rows={summary} className="text-sm" />
            </Card>
            {billing ? (
              <BillingCard
                booking={booking}
                billing={billing}
                finance={permissions.includes("invoices.manage")}
                manage={manage}
              />
            ) : null}
            <CustomerCard booking={booking} editable={manage} />
            {permissions.includes("bookings.notes") ? (
              <Card>
                <CardTitle meta="Staff only">Notes</CardTitle>
                <Notes bookingId={booking.id} notes={notes} />
              </Card>
            ) : null}
            <HistoryCard
              href={recordHistoryHref(href)}
              entries={entriesSeenBy(entries, permissions)}
            />
          </>
        }
      />
    </>
  );
}

/**
 * The booking's billing: its invoices and credit notes, each with what it
 * bills this booking and where it stands, what it charges against what is
 * billed, and what is not invoiced yet; Finance bills that alone. A
 * booking with a legacy number says it is billed outside the system; one
 * not confirmed yet, that it is billed when confirmed.
 */
function BillingCard({
  booking,
  billing,
  finance,
  manage,
}: {
  booking: BookingWithItems;
  billing: BookingBilling;
  finance: boolean;
  manage: boolean;
}) {
  const label = bookingLabelOf(booking);
  const legacyControl = manage ? (
    <LegacyInvoiceControl
      bookingId={booking.id}
      value={billing.legacy}
      billedHere={billing.documents.some((d) => d.status === "issued")}
    />
  ) : null;
  return (
    <Card flush>
      <CardTitle
        inset
        meta={
          billing.money ? (
            <PaymentStateBadge state={billing.money.state} />
          ) : null
        }
        action={billing.legacy === null ? legacyControl : null}
      >
        Billing
      </CardTitle>
      {billing.legacy !== null ? (
        <div className="grid gap-2 px-5 pb-4">
          <p className="text-sm">
            <span className="font-semibold text-ink">
              Billed outside the system
            </span>
            <span className="block text-muted">
              Legacy invoice {billing.legacy}. Its changes are billed in
              Finance&apos;s sheet.
            </span>
          </p>
          <div>{legacyControl}</div>
        </div>
      ) : booking.confirmedAt === null && billing.documents.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-muted">
          {booking.status === "cancelled"
            ? "Cancelled before it was confirmed: nothing was billed."
            : "Billed when it is confirmed."}
        </p>
      ) : (
        <>
          {billing.documents.length > 0 ? (
            <CardRows>
              {billing.documents.map((doc) => (
                <CardRow
                  key={doc.id}
                  className="items-start justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">
                      {finance ? (
                        <Link
                          href={invoiceHref(doc.id)}
                          className="hover:underline"
                        >
                          {doc.label}
                        </Link>
                      ) : (
                        doc.label
                      )}
                    </span>
                    <span className="block text-caption text-muted">
                      {[
                        doc.type === "credit"
                          ? `Credit note${doc.credits ? ` on ${doc.credits}` : ""}`
                          : (doc.period ?? null),
                        doc.issuedAt ? formatLocalDate(doc.issuedAt) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-1">
                    <span className="tabular-nums">
                      {formatMyr(doc.amountSen)}
                    </span>
                    {doc.type === "invoice" ? (
                      <DocumentStateBadge
                        status={doc.status}
                        money={doc.money}
                      />
                    ) : null}
                  </span>
                </CardRow>
              ))}
            </CardRows>
          ) : null}
          <div className="grid gap-3 border-t border-hairline px-5 py-4">
            <Rows
              className="text-sm"
              rows={[
                ["Charged", formatMyr(booking.priceTotalSen)],
                ["Billed", formatMyr(billing.billedSen)],
                ...(billing.money
                  ? ([
                      ["Paid", formatMyr(billing.money.paidSen)],
                      [
                        billing.money.balanceSen < 0 ? "To refund" : "Balance",
                        <strong key="b" className="font-bold text-ink">
                          {formatMyr(Math.abs(billing.money.balanceSen))}
                        </strong>,
                      ],
                    ] as [string, ReactNode][])
                  : []),
              ]}
            />
            {billing.unbilledSen !== 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-warning-tint px-3 py-2 text-sm text-warning-strong">
                <span>
                  <span className="font-semibold">
                    Not invoiced yet: {formatMyr(billing.unbilledSen)}
                  </span>
                  <span className="block text-caption">
                    {billing.draft
                      ? `On the draft${billing.draft.period ? ` for ${billing.draft.period}` : ""}.`
                      : billing.credit
                        ? "Waits for the agent's month-end invoice."
                        : "Its invoice was voided, or it is waiting to be billed."}
                  </span>
                </span>
                {finance && !billing.draft && billing.unbilledSen > 0 ? (
                  <BillAloneControl
                    bookingId={booking.id}
                    label={label}
                    amount={formatMyr(billing.unbilledSen)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}

/**
 * Every state the booking went through, oldest first: Rev 1 as booked,
 * then each change with its kind, the customer's line, the total after it,
 * who made it and when. Each opens the booking as it stood, read only.
 */
function RevisionsCard({
  scope,
  bookingId,
  revisions,
}: {
  scope: ScopeSlug;
  bookingId: string;
  revisions: Awaited<ReturnType<typeof listRevisions>>;
}) {
  if (revisions.length === 0) return null;
  return (
    <Card flush>
      <CardTitle inset meta={`${revisions.length}`}>
        Revisions
      </CardTitle>
      <ol>
        {[...revisions].reverse().map((revision, index, list) => {
          const before = list[index + 1];
          const difference = before
            ? revision.chargedSen - before.chargedSen
            : null;
          return (
            <li
              key={revision.id}
              className="border-t border-hairline first:border-t-0"
            >
              <Link
                href={revisionHref(scope, bookingId, revision.number)}
                className="grid grid-cols-[3.25rem_1fr_auto] items-start gap-3 px-5 py-3 text-sm hover:bg-hover focus-ring"
              >
                <span className="font-semibold text-ink tabular-nums">
                  Rev {revision.number}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge>
                      {isRevisionKind(revision.kind)
                        ? REVISION_KIND_LABELS[revision.kind]
                        : revision.kind}
                    </Badge>
                    <span className="text-body">{revision.summary}</span>
                  </span>
                  <span className="mt-0.5 block text-caption text-muted">
                    {formatLocalDateTime(revision.createdAt)}
                    {revision.reason ? ` · ${revision.reason}` : ""}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block font-semibold text-ink">
                    {formatMyr(revision.chargedSen)}
                  </span>
                  {difference !== null && difference !== 0 ? (
                    <span
                      className={cx(
                        "block text-caption",
                        difference > 0 ? "text-muted" : "text-success",
                      )}
                    >
                      {difference > 0 ? "+" : "−"}
                      {formatMyr(Math.abs(difference))}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function CustomerCard({
  booking,
  editable = false,
}: {
  booking: BookingWithItems;
  /** Reservation's (`bookings.manage`): the details may be corrected here. */
  editable?: boolean;
}) {
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
        {editable ? (
          <EditContactControl
            bookingId={booking.id}
            contact={{
              name: booking.contactName,
              phone: booking.contactPhone,
              email: booking.contactEmail ?? email ?? "",
            }}
          />
        ) : null}
      </div>
    </Card>
  );
}

/** One trip of a booking: its title and status, its steps, its stops and details, its price and its next step. */
function TripCard({
  item,
  charges,
  permissions,
  scope,
  confirmBills,
}: {
  item: BookingItemWithDetails;
  /** The trip's charges besides its price. */
  charges: readonly { id: string; label: string; amountSen: number }[];
  permissions: readonly Permission[];
  scope: ScopeSlug;
  /** What confirming bills, while the booking is received. */
  confirmBills: string | null;
}) {
  const next = nextItemStatusOf(item.status);
  const trip = tripViewOfItem(item);
  const details = item.tripDetails;
  const stops = stopsOf(details?.stops);

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

  // The receipt, each stop's addition, then the agreed price when one
  // replaces the quote. The quote stays on record next to what is charged.
  const receipt = priceBreakdownOf(item.priceBreakdown);
  const quote = itemQuoteSen(item);
  const agreed = item.priceTotalSen !== quote;
  const price: [string, ReactNode][] = receipt ? priceRows(receipt) : [];
  for (const stop of stops) {
    if (stop.quoteAddSen > 0) {
      price.push([
        `Stop at ${stop.place.label}`,
        `+${formatMyr(stop.quoteAddSen)}`,
      ]);
    }
  }
  if (agreed) {
    price.push(["Quoted price", formatMyr(quote)]);
    price.push([
      "Agreed price",
      <span key="o">
        <span className="block">{formatMyr(item.priceTotalSen)}</span>
        {item.priceOverrideReason ? (
          <span className="block text-xs font-normal text-muted">
            {item.priceOverrideReason}
          </span>
        ) : null}
      </span>,
    ]);
  }
  for (const charge of charges) {
    price.push([charge.label, formatMyr(charge.amountSen)]);
  }
  const chargesSen = charges.reduce((sum, c) => sum + c.amountSen, 0);
  price.push([
    "Total",
    <strong key="t" className="font-bold text-ink">
      {formatMyr(
        (item.status === "cancelled" ? 0 : item.priceTotalSen) + chargesSen,
      )}
    </strong>,
  ]);

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
              last={!trip.dropoff && stops.length === 0}
              line={[
                formatLocalDateTime(trip.startsAt),
                trip.hours !== null ? `${trip.hours} hours` : null,
              ]}
            />
            {stops.map((stop, index) => (
              <Stop
                key={`${stop.place.placeId}-${index}`}
                place={stop.place}
                first={false}
                last={!trip.dropoff && index === stops.length - 1}
                line={[
                  "Stop",
                  stop.waitMinutes > 0 ? `wait ${stop.waitMinutes} min` : null,
                ]}
              />
            ))}
            {trip.dropoff ? (
              <Stop
                place={trip.dropoff}
                first={false}
                last
                line={[
                  trip.distanceKm !== null
                    ? `${trip.distanceKm.toFixed(1)} km by road${stops.length > 0 ? " without stops" : ""}`
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
        canAdvance={
          next !== null && permissions.includes(ADVANCE_PERMISSIONS[next])
        }
        confirmBills={confirmBills}
      />
    </Card>
  );
}

/** A trip's stop, on the line from the pick-up to the drop-off: the place, its address, then the time or the distance. */
export function Stop({
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
