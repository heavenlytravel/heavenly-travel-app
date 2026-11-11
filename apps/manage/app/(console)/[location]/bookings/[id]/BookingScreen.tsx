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
  plural,
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
  listStaffRevisions,
  listTripEvents,
  type ActivityEntry,
  type BookingBilling,
  type BookingItemWithDetails,
  type BookingWithItems,
  type FulfilmentTrip,
} from "@repo/db/server";
import { Badge, type BadgeTone } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import {
  CheckIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  PhoneIcon,
} from "@repo/ui/icons";
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
import { TripDay } from "../../assign/TripReports";
import { ItemActions } from "./BookingControls";
import {
  BookingAgentControl,
  OldInvoiceNumberControl,
  PayLaterControl,
} from "./BillingControls";
import {
  BookingChangeMenu,
  ChangeBooking,
  ReinstateBookingButton,
  TripChangeMenu,
  type ChangeTrip,
} from "./ChangeBooking";
import { Notes } from "./Notes";
import { TripCrew } from "./TripCrew";
import { RevisionDetails } from "../_components/RevisionDetails";
import { EditContactControl } from "./EditContact";
import { RecordPaymentControl } from "../../invoices/_components/PaymentControls";
import { PaymentsTable } from "../../invoices/_components/PaymentsTable";

/** What stands where the booking is loading: its header and its two columns of cards. */
export function BookingSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <DetailSkeleton
        main={
          <>
            <CardSkeleton rows={9} />
            <CardSkeleton rows={9} />
          </>
        }
        side={
          <>
            <CardSkeleton rows={6} />
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
 * What the booking waits for, under its header, one chip each: trips to
 * confirm, trips to assign, money not invoiced yet, a balance to collect
 * or refund. "All done" once nothing does.
 */
function waitingOn(
  booking: BookingWithItems,
  billing: BookingBilling | null,
): { tone: BadgeTone; text: string }[] {
  const count = (status: ItemStatus) =>
    booking.items.filter((item) => item.status === status).length;
  const chips: { tone: BadgeTone; text: string }[] = [];
  const received = count("received");
  const confirmed = count("confirmed");
  if (received > 0) {
    chips.push({
      tone: "amber",
      text: `${plural(received, "trip")} to confirm`,
    });
  }
  if (confirmed > 0) {
    chips.push({
      tone: "amber",
      text: `${plural(confirmed, "trip")} to assign`,
    });
  }
  // On its open invoice, it is in the balance already.
  if (billing && billing.unbilledSen > 0 && !billing.open) {
    chips.push({
      tone: "neutral",
      text: `${formatMyr(billing.unbilledSen)} not invoiced yet`,
    });
  }
  const balance = billing?.money?.balanceSen ?? 0;
  if (balance > 0) {
    chips.push({ tone: "amber", text: `${formatMyr(balance)} to collect` });
  } else if (balance < 0) {
    chips.push({ tone: "red", text: `${formatMyr(-balance)} to refund` });
  }
  return chips;
}

/**
 * One booking for ops, under its number (HTB-1042): who made it, when and
 * where, and what it waits for. Then a card per trip holding all of it:
 * its steps, its stops and details, who does it and what the driver
 * reported, its price and its own changes ("Change trip"), and the
 * booking's revisions with what each billed. Beside them its money in
 * one place (what it charges, its invoices, what is paid and the
 * balance), the customer, the staff's notes and the last of its history.
 * "History" and "Change booking" (add a trip, a booking charge, cancel)
 * stand in the header. Every change says what it bills before it is
 * saved. After an amend that no longer fits what is assigned, the page
 * says so (`warn`). Every team opens it; the controls follow what the
 * admin may do. It opens under `~` and under any location a trip picks up
 * in; under another location it is not found.
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
      listStaffRevisions(id),
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
  // A cancelled booking takes no change but its reinstating, in the header.
  const rights = cancelled
    ? { manage: false, price: false, extras: false }
    : {
        manage,
        price: permissions.includes("bookings.create"),
        extras: manage || canFulfil,
      };
  const chips = cancelled ? [] : waitingOn(booking, billing);

  return (
    <ChangeBooking
      bookingId={booking.id}
      label={label}
      chargedSen={booking.priceTotalSen}
      keptOnCancelSen={keptOnCancelSen}
      trips={trips}
      rights={rights}
    >
      <PageHeader
        title={label}
        badge={<BookingStatusBadge status={booking.status} />}
        meta={
          <>
            <span className="block">{bookedLine(booking, entries)}</span>
            {chips.length > 0 ? (
              <span className="mt-2.5 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <Badge key={chip.text} tone={chip.tone} dot>
                    {chip.text}
                  </Badge>
                ))}
              </span>
            ) : null}
          </>
        }
        action={
          <>
            <HistoryLink href={recordHistoryHref(href)} />
            {cancelled ? (
              manage ? (
                <ReinstateBookingButton bookingId={booking.id} label={label} />
              ) : null
            ) : (
              <BookingChangeMenu
                addTripHref={
                  manage &&
                  booking.items.length < BOOKING_RULES.maxTripsPerBooking
                    ? addTripHref(scope.slug, booking.id)
                    : null
                }
                cancellable={booking.status !== "completed"}
              />
            )}
          </>
        }
      />

      {cancelled ? (
        <Notice tone="danger" className="mb-5">
          Cancelled
          {booking.cancelledAt
            ? ` ${formatLocalDateTime(booking.cancelledAt)}`
            : ""}
          {booking.cancelledBy ? ` by ${booking.cancelledBy}` : ""}.
        </Notice>
      ) : null}

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
            {booking.items.map((item) => (
              <TripCard
                key={item.id}
                bookingId={booking.id}
                item={item}
                fulfilment={fulfilment.find((t) => t.id === item.id) ?? null}
                events={events.filter((e) => e.itemId === item.id)}
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
              documents={billing?.documents ?? []}
            />
          </>
        }
        side={
          <>
            <MoneyCard
              booking={booking}
              billing={billing}
              finance={permissions.includes("invoices.manage")}
              manage={manage}
            />
            <CustomerCard
              booking={booking}
              editable={manage && !cancelled}
              agents={agents}
            />
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
    </ChangeBooking>
  );
}

/**
 * One invoice or credit note on the Pricing card: its number (a link for
 * Finance), what it is (open and following the booking, issued and when,
 * a month-end run, a credit note), what it bills this booking, and where
 * it stands.
 */
function DocumentLine({
  doc,
  finance,
}: {
  doc: BookingBilling["documents"][number];
  finance: boolean;
}) {
  const what =
    doc.type === "credit"
      ? "Credit note"
      : doc.period
        ? doc.status === "open"
          ? `Agent's ${doc.period} invoice: numbered and issued when the period ends`
          : `Agent's ${doc.period} invoice`
        : doc.status === "open"
          ? "Follows the booking; numbered and issued when it is completed"
          : null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block font-semibold text-ink">
          {finance ? (
            <Link href={invoiceHref(doc.id)} className="hover:underline">
              {doc.label}
            </Link>
          ) : (
            doc.label
          )}
        </span>
        <span className="block text-caption text-muted">
          {[
            what,
            doc.status !== "open" && doc.revisionNumber !== null
              ? `up to #${doc.revisionNumber}`
              : null,
            doc.issuedAt ? formatLocalDate(doc.issuedAt) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="grid shrink-0 justify-items-end gap-1">
        <span className="tabular-nums">{formatMyr(doc.amountSen)}</span>
        <DocumentStateBadge status={doc.status} money={doc.money} />
      </span>
    </div>
  );
}

/**
 * The booking's pricing and payments in one place, read top to bottom:
 * what each trip and charge comes to and the total; then its invoices,
 * the open one first while the booking is live (opened at confirming, it
 * follows every change and is numbered and issued when the booking is
 * completed), each with its credit notes under it; then what is paid and
 * the balance; then what waits to be billed elsewhere (a month-end run, a
 * credit to give); then its payments and refunds. On an agent's month-end
 * invoice it reads this booking's share only: its amount and the payments
 * for it, never the other bookings'. Finance records a payment for it on
 * the oldest invoice it still owes on (hidden once nothing is owed), a
 * refund where it paid over, and reverses one entered wrong; issuing is
 * on the invoice's own page. One not confirmed yet says its invoice opens
 * when confirmed. The old system's invoice number is a note at the foot.
 */
function MoneyCard({
  booking,
  billing,
  finance,
  manage,
}: {
  booking: BookingWithItems;
  billing: BookingBilling | null;
  finance: boolean;
  manage: boolean;
}) {
  const charges: [string, ReactNode][] = booking.items.map((item) => {
    const own = booking.charges
      .filter((c) => c.itemId === item.id)
      .reduce((sum, c) => sum + c.amountSen, 0);
    const price = item.status === "cancelled" ? 0 : item.priceTotalSen;
    return [
      `Trip ${item.position}${item.status === "cancelled" ? " (cancelled)" : ""}`,
      formatMyr(price + own),
    ];
  });
  for (const charge of booking.charges.filter((c) => c.itemId === null)) {
    charges.push([charge.label, formatMyr(charge.amountSen)]);
  }
  charges.push([
    "Total",
    <strong key="t" className="font-bold text-ink">
      {formatMyr(booking.priceTotalSen)}
    </strong>,
  ]);

  const unbilled = billing?.unbilledSen ?? 0;
  // What is not billed and not on its open invoice either.
  const waiting = !billing
    ? null
    : unbilled < 0
      ? {
          title: `To credit: ${formatMyr(-unbilled)}`,
          note: billing.ended
            ? "Credited on its invoices' credit notes."
            : "A credit note is issued when the booking is completed.",
        }
      : unbilled > 0 && !billing.open
        ? {
            title: `Not invoiced yet: ${formatMyr(unbilled)}`,
            note: billing.monthly
              ? "Goes on the agent's month-end invoice when it is saved next."
              : "Its invoice was voided: Finance reissues it.",
          }
        : null;
  const invoices = billing?.documents.filter((d) => d.type === "invoice") ?? [];
  const notesOf = (invoiceId: string) =>
    billing?.documents.filter(
      (d) => d.type === "credit" && d.creditsId === invoiceId,
    ) ?? [];
  // Credit notes whose invoice this booking is not on: listed on their own.
  const loose =
    billing?.documents.filter(
      (d) => d.type === "credit" && !invoices.some((i) => i.id === d.creditsId),
    ) ?? [];
  const notYet = booking.confirmedAt === null && !billing?.documents.length;

  return (
    <Card flush>
      <CardTitle
        inset
        meta={
          billing?.money ? (
            <PaymentStateBadge state={billing.money.state} />
          ) : null
        }
      >
        Pricing
      </CardTitle>
      <div className="px-5 pb-2">
        <Rows rows={charges} className="text-sm" />
      </div>

      {!billing ? null : notYet ? (
        <p className="border-t border-hairline px-5 py-4 text-sm text-muted">
          {booking.status === "cancelled"
            ? "Cancelled before it was confirmed: nothing was billed."
            : "Not invoiced yet: its invoice opens when it is confirmed."}
        </p>
      ) : (
        <>
          {billing.documents.length > 0 ? (
            <>
              <h3 className="border-t border-hairline px-5 pt-4 pb-1 text-caption font-semibold tracking-wide text-muted uppercase">
                {invoices.length === 1 ? "Invoice" : "Invoices"}
              </h3>
              <CardRows>
                {[...invoices]
                  .sort((a, b) =>
                    a.status === "open" ? -1 : b.status === "open" ? 1 : 0,
                  )
                  .map((doc) => (
                    <CardRow key={doc.id} className="grid gap-2 text-sm">
                      <DocumentLine doc={doc} finance={finance} />
                      {notesOf(doc.id).map((note) => (
                        <div
                          key={note.id}
                          className="border-l-2 border-hairline pl-3"
                        >
                          <DocumentLine doc={note} finance={finance} />
                        </div>
                      ))}
                    </CardRow>
                  ))}
                {loose.map((note) => (
                  <CardRow key={note.id} className="text-sm">
                    <DocumentLine doc={note} finance={finance} />
                  </CardRow>
                ))}
              </CardRows>
            </>
          ) : null}
          <div className="grid gap-3 border-t border-hairline px-5 py-4">
            {billing.money ? (
              <Rows
                className="text-sm"
                rows={[
                  ["Paid", formatMyr(billing.money.paidSen)],
                  [
                    billing.money.balanceSen < 0 ? "To refund" : "Balance",
                    <strong key="b" className="font-bold text-ink">
                      {formatMyr(Math.abs(billing.money.balanceSen))}
                    </strong>,
                  ],
                ]}
              />
            ) : null}
            {billing.payLater ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-brand-tint px-3 py-2 text-sm text-brand-strong">
                <span>
                  <span className="block font-semibold">Pay later</span>
                  <span className="block text-caption">
                    {billing.payLater.byTerms
                      ? billing.payLater.dueOn
                        ? `On the agent's terms, due ${formatLocalDate(billing.payLater.dueOn)}.`
                        : "On the agent's terms: due once its month-end invoice is issued."
                      : billing.payLater.dueOn
                        ? `Agreed, to be paid by ${formatLocalDate(billing.payLater.dueOn)}.`
                        : "Agreed for later."}
                  </span>
                </span>
                {manage && !billing.payLater.byTerms ? (
                  <PayLaterControl
                    bookingId={booking.id}
                    dueOn={
                      billing.payLater.dueOn?.toISOString().slice(0, 10) ?? null
                    }
                  />
                ) : null}
              </div>
            ) : manage &&
              !billing.monthly &&
              booking.status !== "cancelled" &&
              billing.money?.state === "unpaid" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted">
                <span>No payment yet. Agreed to be paid later?</span>
                <PayLaterControl bookingId={booking.id} dueOn={null} />
              </div>
            ) : null}
            {waiting ? (
              <div className="rounded-control bg-warning-tint px-3 py-2 text-sm text-warning-strong">
                <span className="block font-semibold">{waiting.title}</span>
                <span className="block text-caption">{waiting.note}</span>
              </div>
            ) : null}
            {billing.open && finance ? (
              <p className="text-caption text-muted">
                {billing.open.period
                  ? "Issue it, or bill this booking on its own, on "
                  : "Issue it early on "}
                <Link
                  href={invoiceHref(billing.open.id)}
                  className="text-link hover:underline"
                >
                  {billing.open.period
                    ? `the agent's ${billing.open.period} invoice`
                    : "its invoice page"}
                </Link>
                .
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 pt-4 pb-1">
            <h3 className="text-caption font-semibold tracking-wide text-muted uppercase">
              Payments
            </h3>
            {finance && (billing.payTo || billing.refundFrom) ? (
              <span className="flex flex-wrap gap-2">
                {billing.payTo ? (
                  <RecordPaymentControl
                    invoiceId={billing.payTo.id}
                    label={billing.payTo.label}
                    balanceSen={billing.payTo.balanceSen}
                    refund={false}
                    bookingId={booking.id}
                  />
                ) : null}
                {billing.refundFrom ? (
                  <RecordPaymentControl
                    invoiceId={billing.refundFrom.id}
                    label={billing.refundFrom.label}
                    balanceSen={billing.refundFrom.refundSen}
                    refund
                    bookingId={booking.id}
                  />
                ) : null}
              </span>
            ) : null}
          </div>
          <PaymentsTable
            payments={billing.payments.map((payment) => ({
              ...payment,
              document: { id: payment.documentId, label: payment.document },
            }))}
            reversible={finance}
            empty="Nothing paid yet."
            compact
          />
        </>
      )}

      {billing && (billing.oldInvoiceNumber !== null || manage) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 py-3 text-caption">
          <span>
            <span className="text-muted">Old invoice number </span>
            <span className="text-ink">
              {billing.oldInvoiceNumber ?? "None"}
            </span>
          </span>
          {manage ? (
            <OldInvoiceNumberControl
              bookingId={booking.id}
              value={billing.oldInvoiceNumber}
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Its amendments, every state the booking went through, newest first:
 * #1 the original booking,
 * then each change with its kind, the customer's line, what it changed
 * field by field, the total after it and what it moved, who made it and
 * when, and the invoice or credit
 * note that billed up to it. Each opens the booking as it stood, read
 * only.
 */
function RevisionsCard({
  scope,
  bookingId,
  revisions,
  documents,
}: {
  scope: ScopeSlug;
  bookingId: string;
  revisions: Awaited<ReturnType<typeof listStaffRevisions>>;
  documents: BookingBilling["documents"];
}) {
  if (revisions.length === 0) return null;
  return (
    <Card flush>
      <CardTitle
        inset
        meta={`${revisions.length}`}
        description="Every change to the booking, and what billed it."
      >
        Amendments
      </CardTitle>
      <ol>
        {[...revisions].reverse().map((revision, index, list) => {
          const before = list[index + 1];
          const difference = before
            ? revision.chargedSen - before.chargedSen
            : null;
          const billed = documents
            .filter(
              (doc) =>
                doc.revisionNumber === revision.number && doc.status !== "void",
            )
            .map((doc) =>
              doc.status === "open"
                ? doc.period
                  ? `the agent's ${doc.period} invoice`
                  : "its open invoice"
                : doc.label,
            );
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
                  #{revision.number}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge>
                      {isRevisionKind(revision.kind)
                        ? REVISION_KIND_LABELS[revision.kind]
                        : revision.kind}
                    </Badge>
                    {revision.kind === "booked" ? null : (
                      <span className="text-body">{revision.summary}</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-caption text-muted">
                    {[
                      formatLocalDateTime(revision.createdAt),
                      revision.by,
                      revision.reason,
                      billed.length > 0
                        ? `Billed on ${billed.join(", ")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <RevisionDetails details={revision.details} />
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

/**
 * Who the booking is for: the agent it came through, when one, then the
 * customer's name, phone, email and account, with Call and WhatsApp.
 * Reservation corrects the details and the agent here (`editable`).
 */
export function CustomerCard({
  booking,
  editable = false,
  agents = [],
}: {
  booking: BookingWithItems;
  /** Reservation's (`bookings.manage`): the details and the agent may be corrected here. */
  editable?: boolean;
  /** The agents to choose from when `editable`. */
  agents?: readonly { id: string; name: string }[];
}) {
  const email = customerEmailOf(booking);
  const phone = booking.contactPhone;
  const call = phoneHrefOf(phone) ?? `tel:${phone}`;
  const whatsapp = whatsappHrefOf(phone);
  const rows: [string, ReactNode][] = [];
  if (booking.business || editable) {
    rows.push([
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
          <span className="font-normal text-muted">None, our own customer</span>
        )}
        {editable ? (
          <BookingAgentControl
            bookingId={booking.id}
            agentId={booking.business?.id ?? null}
            agents={agents}
          />
        ) : null}
      </span>,
    ]);
  }
  // The account the booking shows under, when there is one. A guest has
  // none, whether they booked on the website or staff entered it; the
  // activity log says which.
  rows.push(
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
  );
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

/**
 * One trip of a booking, everything about it in one card: its title and
 * "Change trip", its steps, its stops, its details, who does it and what
 * the driver reported on the day, its price (folded to its total, opened
 * for what it is made of) and its next step.
 */
function TripCard({
  bookingId,
  item,
  fulfilment,
  events,
  charges,
  permissions,
  scope,
  confirmBills,
}: {
  bookingId: string;
  item: BookingItemWithDetails;
  /** Who does it; null for a trip the fulfilment does not list. */
  fulfilment: FulfilmentTrip | null;
  /** What its driver reported. */
  events: Awaited<ReturnType<typeof listTripEvents>>;
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
  const cancelled = item.status === "cancelled";

  // Short facts side by side; a long one (the notes) takes the row.
  const facts: [string, ReactNode][] = details
    ? tripDetailRows(details).filter(([label]) => label !== "Vehicle")
    : [];
  if (!trip)
    facts.unshift(["Pick-up time", formatLocalDateTime(item.startsAt)]);
  if (item.district) {
    facts.push([
      "District",
      `${item.district.name}, ${item.district.state.name}`,
    ]);
  }
  if (item.location) {
    // Under every location, the way to the same booking inside its location.
    facts.push([
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
  const totalSen = (cancelled ? 0 : item.priceTotalSen) + chargesSen;

  return (
    <Card flush>
      <CardTitle
        inset
        meta={[itemHeading(item), details?.vehicleClassName]
          .filter(Boolean)
          .join(" · ")}
        action={<TripChangeMenu tripId={item.id} />}
      >
        {`Trip ${item.position}${trip ? ` · ${TRIP_MODE_LABELS[trip.mode]}` : ""}`}
      </CardTitle>
      <TripSteps item={item} />
      <div className={cx("grid gap-5 p-5", cancelled && "opacity-70")}>
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
        {facts.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className={cx(
                  "grid min-w-0 gap-0.5",
                  label === "Notes" && "col-span-full",
                )}
              >
                <dt className="text-caption text-muted">{label}</dt>
                <dd className="font-medium text-body [overflow-wrap:anywhere]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {fulfilment ? (
          <div className="border-t border-hairline pt-4 empty:hidden">
            <TripCrew
              bookingId={bookingId}
              trip={fulfilment}
              canFulfil={permissions.includes("bookings.fulfil")}
              scope={scope}
            />
          </div>
        ) : null}
        {fulfilment && events.length > 0 ? (
          <section className="grid gap-3 border-t border-hairline pt-4">
            <h3 className="text-sm font-semibold text-ink">On the day</h3>
            <TripDay
              bookingId={bookingId}
              trip={fulfilment}
              events={events}
              canFulfil={false}
            />
          </section>
        ) : null}
        <details className="group/price border-t border-hairline pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm focus-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1.5 text-muted">
              <ChevronRightIcon className="size-3.5 transition-transform group-open/price:rotate-90" />
              Price
              {cancelled ? " (cancelled)" : ""}
            </span>
            <strong className="font-bold text-ink tabular-nums">
              {formatMyr(totalSen)}
            </strong>
          </summary>
          {price.length > 0 ? (
            <Rows rows={price} className="mt-2 text-sm" />
          ) : null}
        </details>
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
      <p className="border-b border-hairline bg-danger-tint px-5 py-3 text-sm font-semibold text-danger-strong">
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
                  done
                    ? "font-semibold text-ink"
                    : nextUp
                      ? "font-semibold text-warning"
                      : "text-muted",
                )}
              >
                {ITEM_STATUS_LABELS[step]}
              </span>
              {at ? (
                <span className="text-2xs text-muted">
                  {formatLocalDateTime(at)}
                </span>
              ) : nextUp ? (
                <span className="text-2xs text-muted">Next</span>
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
