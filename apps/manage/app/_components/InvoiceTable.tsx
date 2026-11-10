import {
  formatLocalDate,
  formatMyr,
  madeDirectionOf,
  nextMadeOrder,
  type InvoiceMoney,
  type MadeOrder,
} from "@repo/db";
import type { InvoiceRow } from "@repo/db/server";
import {
  InvoiceStatusBadge,
  PaymentStateBadge,
} from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  SortTh,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import { cx } from "@repo/ui/cx";
import Link from "next/link";
import { invoiceHref } from "../_lib/routes";

/**
 * Where a document stands, in one chip: a draft or a void one by its own
 * step, an issued invoice by its money (Unpaid, Overdue, Paid…), an open
 * one by both (Open, then Paid or Partially paid), an issued credit note
 * as issued.
 */
export function DocumentStateBadge({
  status,
  money,
}: {
  status: string;
  money: InvoiceMoney | null;
}) {
  if (!money || (status !== "issued" && status !== "open")) {
    return <InvoiceStatusBadge status={status} />;
  }
  if (status === "open") {
    return (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        <InvoiceStatusBadge status={status} />
        <PaymentStateBadge state={money.state} />
      </span>
    );
  }
  return <PaymentStateBadge state={money.state} />;
}

/** An amount in a table cell, right aligned in tabular figures; a dash for none. */
export function MoneyCell({
  sen,
  strong = false,
}: {
  sen: number | null;
  strong?: boolean;
}) {
  return (
    <Td className="text-right whitespace-nowrap tabular-nums">
      {sen === null ? (
        <span className="text-muted">–</span>
      ) : strong ? (
        <strong className="font-semibold text-ink">{formatMyr(sen)}</strong>
      ) : (
        formatMyr(sen)
      )}
    </Td>
  );
}

/** What a document bills, under its number: its booking, "HTB-0042 +3" for more, or a run's period. */
function billsOf(row: InvoiceRow) {
  if (row.period) {
    return `${row.period} · ${row.bookings.length} ${row.bookings.length === 1 ? "booking" : "bookings"}`;
  }
  const [first, ...rest] = row.bookings;
  if (!first) return "–";
  return rest.length > 0 ? `${first} +${rest.length}` : first;
}

/** When it was issued; an open one, since when it is open; a draft, when made. */
function whenOf(row: InvoiceRow) {
  if (row.issuedAt) return formatLocalDate(row.issuedAt);
  if (row.open) return `Open since ${formatLocalDate(row.createdAt)}`;
  return `Made ${formatLocalDate(row.createdAt)}`;
}

/**
 * Invoices in a table, each credit note under the invoice it credits:
 * the number with the booking it bills under it (or the run's period),
 * who it is billed to, when it was issued, its total, what is left to
 * pay, when it is due, and where it stands. Finance's list and an
 * agent's page show it; each number opens its page. On a phone, a row
 * each of what Finance reads first: the number and its booking, what is
 * left, the state.
 */
export function InvoiceTable({
  rows,
  empty,
  billTo = true,
  sort,
}: {
  rows: readonly InvoiceRow[];
  empty: string;
  /** Who it is billed to: left out on an agent's own page. */
  billTo?: boolean;
  /** With it, the Number heading sorts by when each was made, the newest first by default. */
  sort?: { order?: MadeOrder; hrefOf: (order: MadeOrder) => string };
}) {
  const columns = billTo ? 7 : 6;
  const listed = rows.flatMap((row) => [
    { row, note: false },
    ...row.notes.map((note) => ({ row: note, note: true })),
  ]);
  return (
    <>
      <ul className="divide-y divide-hairline border-t border-hairline sm:hidden">
        {rows.length === 0 ? (
          <li className="px-5 py-6 text-center text-sm text-muted">{empty}</li>
        ) : (
          listed.map(({ row, note }) => (
            <li key={row.id}>
              <Link
                href={invoiceHref(row.id)}
                className={cx(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 py-3 pr-5 text-sm hover:bg-hover focus-ring",
                  note ? "pl-9" : "pl-5",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">
                    {row.label}
                  </span>
                  <span className="block truncate text-caption text-muted">
                    {note
                      ? `Credit note on ${row.credits ?? "its invoice"}`
                      : [billsOf(row), billTo ? row.billTo.name : null]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </span>
                <span className="grid justify-items-end gap-1">
                  <span className="font-semibold text-ink tabular-nums">
                    {formatMyr(row.money ? row.money.balanceSen : row.totalSen)}
                  </span>
                  <DocumentStateBadge status={row.status} money={row.money} />
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
      <div className="max-sm:hidden">
        <Table bare>
          <THead>
            {sort ? (
              <SortTh
                href={sort.hrefOf(nextMadeOrder(sort.order, "newest"))}
                direction={madeDirectionOf(sort.order, "newest")}
              >
                Number
              </SortTh>
            ) : (
              <Th>Number</Th>
            )}
            {billTo ? <Th>Billed to</Th> : null}
            <Th>Issued</Th>
            <Th align="right">Total</Th>
            <Th align="right">Balance</Th>
            <Th>Due</Th>
            <Th>Status</Th>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={columns}>{empty}</EmptyRow>
            ) : (
              listed.map(({ row, note }) => (
                <tr key={row.id} className={cx(note && "bg-mist")}>
                  <Td className={cx("whitespace-nowrap", note && "pl-10")}>
                    <TwoLines
                      top={
                        <Link
                          href={invoiceHref(row.id)}
                          className="font-semibold underline-offset-4 hover:underline"
                        >
                          {row.label}
                        </Link>
                      }
                      bottom={
                        note
                          ? `Credit note on ${row.credits ?? "its invoice"}`
                          : row.type === "credit"
                            ? `Credit note${row.credits ? ` on ${row.credits}` : ""} · ${billsOf(row)}`
                            : billsOf(row)
                      }
                    />
                  </Td>
                  {billTo ? (
                    <Td className="max-w-56">
                      {note ? null : (
                        <TwoLines
                          top={row.billTo.name || "–"}
                          bottom={row.billTo.businessId ? "Agent" : "Customer"}
                        />
                      )}
                    </Td>
                  ) : null}
                  <Td className="whitespace-nowrap text-body">{whenOf(row)}</Td>
                  <MoneyCell sen={row.totalSen} />
                  <MoneyCell
                    sen={row.money ? row.money.balanceSen : null}
                    strong
                  />
                  <Td className="whitespace-nowrap">
                    {row.dueAt &&
                    row.type === "invoice" &&
                    (row.status === "issued" || row.status === "open") ? (
                      <span
                        className={
                          row.money?.overdue
                            ? "font-semibold text-danger"
                            : undefined
                        }
                      >
                        {formatLocalDate(row.dueAt)}
                      </span>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <DocumentStateBadge status={row.status} money={row.money} />
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </>
  );
}
