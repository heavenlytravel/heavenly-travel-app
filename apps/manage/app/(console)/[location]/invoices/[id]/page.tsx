import Link from "next/link";
import { notFound } from "next/navigation";
import {
  entriesSeenBy,
  formatLocalDate,
  formatLocalDateTime,
  formatMyr,
  INVOICE_TYPE_LABELS,
  isPaymentMethod,
  PAYMENT_METHOD_LABELS,
} from "@repo/db";
import { getInvoice, listActivityFor, type InvoicePage } from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
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
import { cx } from "@repo/ui/cx";
import { Notice } from "@repo/ui/notice";
import { Rows } from "@repo/ui/rows";
import type { ReactNode } from "react";
import {
  DocumentStateBadge,
  MoneyCell,
} from "../../../../_components/InvoiceTable";
import { HistoryCard } from "../../../../_components/RecordHistory";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  agentHref,
  bookingHref,
  invoiceHref,
  recordHistoryHref,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import {
  DraftActions,
  DraftTick,
  RecordPaymentControl,
  ReversePaymentControl,
  VoidControl,
} from "./InvoiceControls";

/**
 * Route: /~/invoices/[id]. One invoice, credit note or month-end draft:
 * who it is billed to, its lines (each a booking's first bill or a
 * revision's difference), its payments and refunds, the credit notes
 * against it, and what is left. Finance records payments, reverses a
 * wrong one, and voids it with its replacement. A draft's lines are
 * ticked and unticked, with what each would bill now, then issued.
 */
export default async function InvoicePageRoute({
  params,
}: PageProps<"/[location]/invoices/[id]">) {
  await requireAdmin("invoices.manage");
  const [scope, { id }] = await Promise.all([scopeOf(params), params]);
  if (scope.slug !== null) notFound();
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
      {() => invoiceScreen(id)}
    </Streamed>
  );
}

async function invoiceScreen(id: string) {
  const [doc, entries, permissions] = await Promise.all([
    getInvoice(id),
    listActivityFor("invoice", id),
    getPermissions(),
  ]);
  if (!doc) notFound();
  const draft = doc.status === "draft";
  const issued = doc.status === "issued";
  const credit = doc.type === "credit";
  const title = draft ? "Draft invoice" : doc.label;
  const ticked = doc.lines.filter((l) => l.ticked);
  const draftTotal = ticked.reduce(
    (sum, l) => sum + Math.max(0, l.amountSen),
    0,
  );
  const livePaid = doc.payments
    .filter((p) => !p.reversedAt)
    .reduce((sum, p) => sum + p.amountSen, 0);

  const meta = [
    credit
      ? INVOICE_TYPE_LABELS.credit
      : doc.period
        ? `Month-end · ${doc.period}`
        : "Invoice",
    doc.billTo.name,
    doc.issuedAt ? `Issued ${formatLocalDate(doc.issuedAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title={title}
        badge={<DocumentStateBadge status={doc.status} money={doc.money} />}
        meta={meta}
        action={
          draft ? (
            <DraftActions
              invoiceId={doc.id}
              total={formatMyr(draftTotal)}
              ticked={ticked.length}
            />
          ) : issued ? (
            <>
              {!credit ? (
                <RecordPaymentControl
                  invoiceId={doc.id}
                  label={doc.label}
                  balanceSen={doc.money?.balanceSen ?? 0}
                  refund={false}
                />
              ) : (
                <RecordPaymentControl
                  invoiceId={doc.id}
                  label={doc.label}
                  balanceSen={-doc.totalSen + livePaid}
                  refund
                />
              )}
              <VoidControl
                invoiceId={doc.id}
                label={doc.label}
                mustReissue={
                  doc.payments.some((p) => !p.reversedAt) ||
                  doc.creditNotes.some((c) => c.status === "issued")
                }
              />
            </>
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
      {draft ? (
        <Notice className="mb-5">
          Tick the bookings this invoice bills. Each shows what it would bill
          now; issuing gives the number and freezes the amounts. Unticked
          bookings wait for the next run, or Finance bills them alone.
        </Notice>
      ) : null}

      <DetailColumns
        main={
          <>
            <Card flush>
              <CardTitle
                inset
                meta={
                  draft
                    ? `${ticked.length} of ${doc.lines.length} ticked`
                    : null
                }
              >
                {draft ? "Bookings" : "Lines"}
              </CardTitle>
              <Table bare>
                <THead>
                  {draft ? <Th /> : null}
                  <Th>Booking</Th>
                  <Th align="right">Amount</Th>
                </THead>
                <TBody>
                  {doc.lines.length === 0 ? (
                    <EmptyRow colSpan={draft ? 3 : 2}>No lines.</EmptyRow>
                  ) : (
                    doc.lines.map((line) => (
                      <tr
                        key={line.id}
                        className={cx(draft && !line.ticked && "text-muted")}
                      >
                        {draft ? (
                          <Td className="w-10">
                            <DraftTick
                              invoiceId={doc.id}
                              bookingId={line.bookingId}
                              label={line.booking}
                              ticked={line.ticked}
                            />
                          </Td>
                        ) : null}
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
                              draft
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
                      </tr>
                    ))
                  )}
                  <tr className="border-t border-hairline">
                    {draft ? <Td /> : null}
                    <Td className="font-semibold text-ink">Total</Td>
                    <MoneyCell sen={draft ? draftTotal : doc.totalSen} strong />
                  </tr>
                </TBody>
              </Table>
            </Card>

            {!draft ? (
              <Card flush>
                <CardTitle inset>{credit ? "Refunds" : "Payments"}</CardTitle>
                <Table bare>
                  <THead>
                    <Th>{credit ? "Refund" : "Payment"}</Th>
                    <Th align="right">Amount</Th>
                    <Th />
                  </THead>
                  <TBody>
                    {doc.payments.length === 0 ? (
                      <EmptyRow colSpan={3}>
                        {credit ? "Nothing refunded yet." : "Nothing paid yet."}
                      </EmptyRow>
                    ) : (
                      doc.payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className={cx(
                            payment.reversedAt && "text-muted line-through",
                          )}
                        >
                          <Td>
                            <TwoLines
                              top={
                                isPaymentMethod(payment.method)
                                  ? PAYMENT_METHOD_LABELS[payment.method]
                                  : payment.method
                              }
                              bottom={[
                                formatLocalDate(payment.paidAt),
                                payment.reversedAt
                                  ? `Reversed: ${payment.reverseReason ?? ""}`
                                  : payment.note,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                              className="[&>span]:whitespace-normal"
                            />
                          </Td>
                          <MoneyCell sen={payment.amountSen} />
                          <Td className="text-right">
                            {!payment.reversedAt && issued ? (
                              <ReversePaymentControl
                                paymentId={payment.id}
                                amount={formatMyr(payment.amountSen)}
                              />
                            ) : null}
                          </Td>
                        </tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </Card>
            ) : null}

            {!credit && doc.creditNotes.length > 0 ? (
              <Card flush>
                <CardTitle inset>Credit notes</CardTitle>
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
                Billed to
              </CardTitle>
              <Rows rows={billToRows(doc)} className="text-sm" />
              <p className="mt-3 text-caption text-muted">
                As at issue. A wrong name is put right on the booking, then this
                is voided and reissued.
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

/** A line's words after its booking's number: "Rev 3: Stop at Pantai Cenang added"; empty for a first bill. */
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
    rows.push(["SSM number", doc.billTo.registrationNo]);
  if (doc.billTo.address) rows.push(["Address", doc.billTo.address]);
  return rows;
}

/** What the document comes to: its total, its credit notes, what came in and what is left, and when it is due. */
function MoneyCard({ doc, livePaid }: { doc: InvoicePage; livePaid: number }) {
  if (doc.status === "draft") return null;
  const rows: [string, ReactNode][] = [["Total", formatMyr(doc.totalSen)]];
  if (doc.type === "invoice" && doc.money) {
    const credited = doc.money.netSen - doc.totalSen;
    if (credited !== 0) rows.push(["Credit notes", formatMyr(credited)]);
    rows.push(["Paid", formatMyr(doc.money.paidSen)]);
    rows.push([
      doc.money.balanceSen < 0 ? "To refund" : "Balance",
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
      <CardTitle>{doc.type === "credit" ? "Credit note" : "Money"}</CardTitle>
      <Rows rows={rows} className="text-sm" />
    </Card>
  );
}
