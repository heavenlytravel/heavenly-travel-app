import Link from "next/link";
import { notFound } from "next/navigation";
import {
  entriesSeenBy,
  formatLocalDate,
  formatLocalDateTime,
  formatMyr,
  INVOICE_TYPE_LABELS,
  isMadeOrder,
  isPaymentMethod,
  isRevisionKind,
  PAYMENT_METHOD_LABELS,
  REVISION_KIND_LABELS,
  textOf,
  type MadeOrder,
} from "@repo/db";
import { getInvoice, listActivityFor, type InvoicePage } from "@repo/db/server";
import { Card, CardRow, CardRows, CardTitle } from "@repo/console/Card";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import { Badge } from "@repo/ui/badge";
import { BookingStatusBadge } from "@repo/console/StatusBadges";
import { cx } from "@repo/ui/cx";
import { Notice } from "@repo/ui/notice";
import { Rows } from "@repo/ui/rows";
import type { ReactNode } from "react";
import {
  DocumentStateBadge,
  MoneyCell,
} from "../../../../_components/InvoiceTable";
import {
  FilterChips,
  ListFilters,
  type FilterGroup,
} from "../../../../_components/ListFilters";
import { HistoryCard } from "../../../../_components/RecordHistory";
import { PdfLink } from "../../../../_components/PdfLink";
import { INVOICE_PDF_STATUSES } from "../../../../_pdf/statuses";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  agentHref,
  bookingHref,
  invoiceHref,
  recordHistoryHref,
  revisionHref,
  SORT_PARAM,
  withParams,
  invoicePdfHref,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { RevisionDetails } from "../../bookings/_components/RevisionDetails";
import { BillNowControl } from "../_components/BillNowControl";
import { RecordPaymentControl } from "../_components/PaymentControls";
import { PaymentsTable } from "../_components/PaymentsTable";
import {
  BillAloneControl,
  IssueMonthEndControl,
  VoidControl,
} from "./InvoiceControls";

/** How its payments are shown: for one booking, paid one way, the newest first. */
type PaymentsView = {
  booking: string | undefined;
  method: string | undefined;
  /** The oldest first when none. */
  sort: MadeOrder | undefined;
};

/**
 * Route: /~/invoices/[id]?booking=…&method=…&sort=newest. One invoice,
 * credit note or month-end draft:
 * who it is billed to, its lines (each a booking's first bill or a
 * revision's difference), the changes it bills, booking by booking, its
 * payments and refunds, the credit notes against it, and what is left.
 * Finance records payments, reverses a wrong one, and voids it with its
 * replacement. A booking's open invoice takes payments as they come in
 * and follows its booking until it is completed; Finance may issue it
 * early. A draft's lines are ticked and unticked, with what each would
 * bill now, then issued. An agent's month-end invoice reads each
 * booking's share on its lines (what it comes to, what was paid for it,
 * what is left), and its payments narrow to one booking or one way of
 * paying, the newest or the oldest first.
 */
export default async function InvoicePageRoute({
  params,
  searchParams,
}: PageProps<"/[location]/invoices/[id]">) {
  await requireAdmin("invoices.manage");
  const [scope, { id }, query] = await Promise.all([
    scopeOf(params),
    params,
    searchParams,
  ]);
  if (scope.slug !== null) notFound();
  const sort = textOf(query[SORT_PARAM]);
  const view: PaymentsView = {
    booking: textOf(query.booking) || undefined,
    method: textOf(query.method) || undefined,
    sort: isMadeOrder(sort) && sort !== "oldest" ? sort : undefined,
  };
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<CardSkeleton rows={6} />}
            side={<CardSkeleton rows={6} />}
          />
        </>
      }
    >
      {() => invoiceScreen(id, view)}
    </Streamed>
  );
}

async function invoiceScreen(id: string, view: PaymentsView) {
  const [doc, entries, permissions] = await Promise.all([
    getInvoice(id),
    listActivityFor("invoice", id),
    getPermissions(),
  ]);
  if (!doc) notFound();
  const issued = doc.status === "issued";
  // Payments go on it: issued, or open and following its bookings.
  const payable = issued || doc.open;
  const credit = doc.type === "credit";
  // An agent's month-end invoice, open until its period ends.
  const monthEnd = doc.open && doc.period !== null;
  // A booking's own open invoice, issued when the booking ends.
  const openBooking = doc.open && !monthEnd ? doc.lines[0] : undefined;
  const livePaid = doc.payments
    .filter((p) => !p.reversedAt)
    .reduce((sum, p) => sum + p.amountSen, 0);
  // An agent's month-end invoice: each booking's share, and its payments by booking.
  const several = doc.lines.length > 1;
  const bookings = several
    ? doc.lines.map((line) => ({
        id: line.bookingId,
        label: `${line.booking} · ${line.contactName}`,
        owedSen: line.money?.balanceSen ?? 0,
      }))
    : undefined;
  const refundDue = several
    ? doc.lines.some((line) => (line.money?.balanceSen ?? 0) < 0)
    : Boolean(doc.money && doc.money.balanceSen < 0);
  const here = withParams(invoiceHref(doc.id), {
    booking: view.booking,
    method: view.method,
    [SORT_PARAM]: view.sort,
  });
  const methods = [...new Set(doc.payments.map((p) => p.method))];
  const groups: FilterGroup[] = [
    ...(several
      ? [
          {
            param: "booking",
            label: "Booking",
            options: doc.lines.map((line) => ({
              value: line.bookingId,
              label: line.booking,
            })),
            value: view.booking ?? "",
          },
        ]
      : []),
    ...(methods.length > 1
      ? [
          {
            param: "method",
            label: "How",
            options: methods.map((method) => ({
              value: method,
              label: isPaymentMethod(method)
                ? PAYMENT_METHOD_LABELS[method]
                : method,
            })),
            value: view.method ?? "",
          },
        ]
      : []),
  ];
  const shown = doc.payments.filter(
    (p) =>
      (!view.booking || p.booking.id === view.booking) &&
      (!view.method || p.method === view.method),
  );
  const payments = (view.sort === "newest" ? [...shown].reverse() : shown).map(
    (payment) => ({
      ...payment,
      booking: several ? payment.booking : undefined,
    }),
  );

  const meta = [
    credit
      ? INVOICE_TYPE_LABELS.credit
      : doc.period
        ? `Month-end · ${doc.period}`
        : "Invoice",
    doc.billTo.name,
    doc.issuedAt
      ? `Issued ${formatLocalDate(doc.issuedAt)}`
      : doc.open
        ? `Opened ${formatLocalDate(doc.createdAt)}`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title={doc.label}
        badge={<DocumentStateBadge status={doc.status} money={doc.money} />}
        meta={meta}
        action={
          payable ? (
            <>
              {INVOICE_PDF_STATUSES.includes(doc.status) ? (
                <PdfLink href={invoicePdfHref(doc.id)} />
              ) : null}
              {!credit ? (
                <>
                  <RecordPaymentControl
                    invoiceId={doc.id}
                    label={doc.label}
                    balanceSen={doc.money?.balanceSen ?? 0}
                    refund={false}
                    bookings={bookings}
                  />
                  {refundDue ? (
                    <RecordPaymentControl
                      invoiceId={doc.id}
                      label={doc.label}
                      balanceSen={-(doc.money?.balanceSen ?? 0)}
                      refund
                      bookings={bookings?.filter((b) => b.owedSen < 0)}
                    />
                  ) : null}
                </>
              ) : (
                <RecordPaymentControl
                  invoiceId={doc.id}
                  label={doc.label}
                  balanceSen={-doc.totalSen + livePaid}
                  refund
                />
              )}
              {monthEnd ? (
                <IssueMonthEndControl
                  invoiceId={doc.id}
                  label={doc.label}
                  total={formatMyr(doc.totalSen)}
                  ready={doc.ready}
                  period={doc.period ?? ""}
                />
              ) : openBooking ? (
                <BillNowControl
                  bookingId={openBooking.bookingId}
                  label={doc.label}
                  unbilledSen={doc.totalSen}
                />
              ) : (
                <VoidControl
                  invoiceId={doc.id}
                  label={doc.label}
                  mustReissue={
                    doc.payments.some((p) => !p.reversedAt) ||
                    doc.creditNotes.some((c) => c.status === "issued")
                  }
                />
              )}
            </>
          ) : INVOICE_PDF_STATUSES.includes(doc.status) ? (
            <PdfLink href={invoicePdfHref(doc.id)} />
          ) : null
        }
      />

      {doc.status === "void" ? (
        <Notice className="mb-5">
          Voided {doc.voidedAt ? formatLocalDateTime(doc.voidedAt) : ""}:{" "}
          {doc.voidReason}
          {doc.replacedBy ? (
            <>
              {" "}
              Replaced by{" "}
              <Link
                href={invoiceHref(doc.replacedBy.id)}
                className="font-semibold underline"
              >
                {doc.replacedBy.label}
              </Link>
              .
            </>
          ) : null}
        </Notice>
      ) : null}
      {monthEnd ? (
        <Notice className="mb-5">
          Open: the agent's invoice for {doc.period}. Each booking of the period
          joins it when confirmed, and an amend moves its line; record payments
          as they come in, for one booking or spread over them, the oldest
          pick-up first. Issue it once the period has ended: it takes its HTI
          number then. Bill on its own moves a booking to an invoice of its own.
        </Notice>
      ) : doc.open ? (
        <Notice className="mb-5">
          Open: this is the booking's invoice while it runs. Record payments as
          they come in, here or on the booking; an amend moves its amount. It is
          issued in full, and takes its HTI number, when the booking is
          completed or cancelled, or now with Issue now.
        </Notice>
      ) : null}

      <DetailColumns
        main={
          <>
            <Card flush>
              <CardTitle
                inset
                meta={monthEnd ? String(doc.lines.length) : null}
              >
                Lines
              </CardTitle>
              <Table bare>
                <THead>
                  <Th>Booking</Th>
                  <Th align="right">Amount</Th>
                  {several ? (
                    <>
                      <Th align="right">Paid</Th>
                      <Th align="right">Balance</Th>
                    </>
                  ) : null}
                  {monthEnd ? <Th /> : null}
                </THead>
                <TBody>
                  {doc.lines.length === 0 ? (
                    <EmptyRow
                      colSpan={2 + (several ? 2 : 0) + (monthEnd ? 1 : 0)}
                    >
                      No lines.
                    </EmptyRow>
                  ) : (
                    doc.lines.map((line) => (
                      <tr key={line.id}>
                        <Td>
                          <TwoLines
                            top={
                              <Link
                                href={bookingHref(null, line.bookingId)}
                                className="font-semibold underline-offset-4 hover:underline"
                              >
                                {line.booking}
                              </Link>
                            }
                            bottom={[
                              doc.open
                                ? null
                                : lineNote(line.description, line.booking),
                              line.contactName,
                              formatLocalDateTime(line.startsAt),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                            className="whitespace-normal [&>span]:whitespace-normal"
                          />
                        </Td>
                        <MoneyCell sen={line.amountSen} />
                        {several ? (
                          <>
                            <MoneyCell sen={line.money?.paidSen ?? null} />
                            <MoneyCell
                              sen={line.money?.balanceSen ?? null}
                              strong
                            />
                          </>
                        ) : null}
                        {monthEnd ? (
                          <Td className="text-right">
                            <BillAloneControl
                              bookingId={line.bookingId}
                              label={line.booking}
                            />
                          </Td>
                        ) : null}
                      </tr>
                    ))
                  )}
                  <tr className="border-t border-hairline">
                    <Td className="font-semibold text-ink">Total</Td>
                    <MoneyCell sen={doc.totalSen} strong />
                    {several ? (
                      <>
                        <MoneyCell sen={doc.money?.paidSen ?? null} />
                        <MoneyCell sen={doc.money?.balanceSen ?? null} strong />
                      </>
                    ) : null}
                    {monthEnd ? <Td /> : null}
                  </tr>
                </TBody>
              </Table>
            </Card>

            <BookingsCard doc={doc} />

            <Card flush>
              <CardTitle
                inset
                meta={
                  groups.length > 0 ? (
                    <ListFilters href={here} groups={groups} />
                  ) : null
                }
              >
                {credit ? "Refunds" : "Payments"}
              </CardTitle>
              {groups.length > 0 ? (
                <div className="px-5">
                  <FilterChips href={here} groups={groups} />
                </div>
              ) : null}
              <PaymentsTable
                payments={payments}
                reversible={Boolean(payable)}
                empty={
                  shown.length < doc.payments.length
                    ? "No payment like this."
                    : credit
                      ? "Nothing refunded yet."
                      : "Nothing paid yet."
                }
                sort={{
                  order: view.sort,
                  hrefOf: (order) =>
                    withParams(here, {
                      [SORT_PARAM]: order === "oldest" ? undefined : order,
                    }),
                }}
              />
            </Card>

            {!credit && doc.creditNotes.length > 0 ? (
              <Card flush>
                <CardTitle inset>Credit Notes</CardTitle>
                <Table bare>
                  <THead>
                    <Th>Number</Th>
                    <Th align="right">Amount</Th>
                  </THead>
                  <TBody>
                    {doc.creditNotes.map((note) => (
                      <tr key={note.id}>
                        <Td>
                          <TwoLines
                            top={
                              <Link
                                href={invoiceHref(note.id)}
                                className="font-semibold whitespace-nowrap underline-offset-4 hover:underline"
                              >
                                {note.label}
                              </Link>
                            }
                            bottom={[
                              note.issuedAt
                                ? formatLocalDate(note.issuedAt)
                                : null,
                              note.status === "void" ? "Void" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          />
                        </Td>
                        <MoneyCell sen={note.totalSen} />
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </Card>
            ) : null}
          </>
        }
        side={
          <>
            <MoneyCard doc={doc} livePaid={livePaid} />
            <Card>
              <CardTitle meta={doc.billTo.businessId ? "Agent" : "Customer"}>
                Billed To
              </CardTitle>
              <Rows rows={billToRows(doc)} className="text-sm" />
              <p className="mt-3 text-caption text-muted">
                {monthEnd
                  ? "The agent's details, taken again when it is issued."
                  : doc.open
                    ? "Follows the booking until it is issued: a change to its customer or agent shows here."
                    : "As at issue. A wrong name is put right on the booking, then this is voided and reissued."}
              </p>
            </Card>
            <HistoryCard
              href={recordHistoryHref(invoiceHref(doc.id))}
              entries={entriesSeenBy(entries, permissions)}
            />
          </>
        }
      />
    </>
  );
}

/**
 * Each booking on the document at a glance, then what the document bills
 * of it: its status, who it is for and its total now, its trips (when,
 * where, in what, for how much), and each revision since its last bill,
 * with what it changed field by field, who made it and the total it left.
 * An agent's month-end invoice reads every booking and every amend on it
 * here. Each booking and revision opens its page.
 */
function BookingsCard({ doc }: { doc: InvoicePage }) {
  if (doc.changes.length === 0) return null;
  return (
    <Card flush>
      <CardTitle
        inset
        meta={String(doc.changes.length)}
        description={
          doc.open
            ? "Each booking now, and the changes it bills so far."
            : "Each booking now, and the changes it bills."
        }
      >
        {doc.changes.length === 1 ? "Booking" : "Bookings"}
      </CardTitle>
      <CardRows>
        {doc.changes.map((booking) => (
          <CardRow key={booking.bookingId} className="grid gap-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={bookingHref(null, booking.bookingId)}
                    className="font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    {booking.booking}
                  </Link>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <p className="text-caption text-muted">{booking.contactName}</p>
              </div>
              <span className="font-semibold text-ink tabular-nums">
                {formatMyr(booking.chargedSen)}
              </span>
            </div>
            {booking.trips.length > 0 ? (
              <ul className="grid gap-1.5 rounded-control bg-mist px-3 py-2.5 text-caption">
                {booking.trips.map((trip) => (
                  <li
                    key={trip.position}
                    className={cx(
                      "flex items-baseline justify-between gap-3",
                      trip.status === "cancelled" && "text-muted line-through",
                    )}
                  >
                    <span className="min-w-0 text-body">
                      <span className="font-semibold text-ink">
                        Trip {trip.position}
                      </span>{" "}
                      {[
                        formatLocalDateTime(new Date(trip.startsAt)),
                        [trip.pickup, ...trip.stops, trip.dropoff]
                          .filter(Boolean)
                          .join(" → "),
                        trip.vehicleClassName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatMyr(trip.chargedSen)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {booking.revisions.length > 0 ? (
              <ol className="grid gap-3">
                {booking.revisions.map((revision) => (
                  <li
                    key={revision.number}
                    className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-start gap-3"
                  >
                    <Link
                      href={revisionHref(
                        null,
                        booking.bookingId,
                        revision.number,
                      )}
                      className="font-semibold text-ink tabular-nums underline-offset-4 hover:underline"
                    >
                      #{revision.number}
                    </Link>
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
                          formatLocalDateTime(revision.at),
                          revision.by,
                          revision.reason,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <RevisionDetails details={revision.details} />
                    </span>
                    <span className="text-right text-ink tabular-nums">
                      {formatMyr(revision.chargedSen)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-caption text-muted">
                No change billed on this one.
              </p>
            )}
          </CardRow>
        ))}
      </CardRows>
    </Card>
  );
}

/** A line's words after its booking's number: "Amendment 3: Stop at Pantai Cenang added"; empty for a first bill. */
function lineNote(description: string, booking: string) {
  return description.startsWith(booking)
    ? description.slice(booking.length).replace(/^[s:]+/, "")
    : description;
}

function billToRows(doc: InvoicePage): [string, ReactNode][] {
  const rows: [string, ReactNode][] = [
    [
      "Name",
      doc.billTo.businessId ? (
        <Link
          key="n"
          href={agentHref(doc.billTo.businessId)}
          className="hover:underline"
        >
          {doc.billTo.name}
        </Link>
      ) : (
        doc.billTo.name || "–"
      ),
    ],
  ];
  if (doc.billTo.email)
    rows.push([
      "Email",
      <span key="e" className="break-all">
        {doc.billTo.email}
      </span>,
    ]);
  if (doc.billTo.phone) rows.push(["Phone", doc.billTo.phone]);
  if (doc.billTo.registrationNo)
    rows.push(["SSM Number", doc.billTo.registrationNo]);
  if (doc.billTo.address) rows.push(["Address", doc.billTo.address]);
  return rows;
}

/** What the document comes to: its total, its credit notes, what came in and what is left, and when it is due. */
function MoneyCard({ doc, livePaid }: { doc: InvoicePage; livePaid: number }) {
  const rows: [string, ReactNode][] = [
    [doc.open ? "Total So Far" : "Total", formatMyr(doc.totalSen)],
  ];
  if (doc.type === "invoice" && doc.money) {
    const credited = doc.money.netSen - doc.totalSen;
    if (credited !== 0) rows.push(["Credit Notes", formatMyr(credited)]);
    rows.push(["Paid", formatMyr(doc.money.paidSen)]);
    rows.push([
      doc.money.balanceSen < 0 ? "To Refund" : "Balance",
      <strong key="b" className="font-bold text-ink">
        {formatMyr(Math.abs(doc.money.balanceSen))}
      </strong>,
    ]);
    if (doc.dueAt) {
      rows.push([
        "Due",
        <span
          key="d"
          className={
            doc.money.overdue ? "font-semibold text-danger" : undefined
          }
        >
          {formatLocalDate(doc.dueAt)}
        </span>,
      ]);
    }
  } else if (doc.type === "credit") {
    if (doc.credits) {
      rows.push([
        "Against",
        <Link
          key="c"
          href={invoiceHref(doc.credits.id)}
          className="hover:underline"
        >
          {doc.credits.label}
        </Link>,
      ]);
    }
    rows.push(["Refunded", formatMyr(-livePaid)]);
  }
  if (doc.replaces) {
    rows.push([
      "Replaces",
      <Link
        key="r"
        href={invoiceHref(doc.replaces.id)}
        className="hover:underline"
      >
        {doc.replaces.label}
      </Link>,
    ]);
  }
  return (
    <Card>
      <CardTitle>{doc.type === "credit" ? "Credit Note" : "Money"}</CardTitle>
      <Rows rows={rows} className="text-sm" />
    </Card>
  );
}
