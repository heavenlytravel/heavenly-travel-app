import { formatLocalDate, formatMyr, type InvoiceMoney } from "@repo/db";
import type { InvoiceRow } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import {
  InvoiceStatusBadge,
  PaymentStateBadge,
} from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import Link from "next/link";
import { invoiceHref } from "../_lib/routes";

/**
 * Where a document stands, in one chip: a draft or a void one by its own
 * step, an issued invoice by its money (Unpaid, Overdue, Paid…), an
 * issued credit note as issued.
 */
export function DocumentStateBadge({
  status,
  money,
}: {
  status: string;
  money: InvoiceMoney | null;
}) {
  if (status !== "issued" || !money)
    return <InvoiceStatusBadge status={status} />;
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

/**
 * Invoices and credit notes in a table: the number and who it is billed
 * to, the period or the bookings it holds, its total, what is left to
 * pay, when it is due, and where it stands. Finance's list and an agent's
 * page show it; each number opens its page. On a phone, a row each of
 * what Finance reads first: the number and who, what is left, the state.
 */
export function InvoiceTable({
  rows,
  empty,
  billTo = true,
}: {
  rows: readonly InvoiceRow[];
  empty: string;
  /** Who it is billed to: left out on an agent's own page. */
  billTo?: boolean;
}) {
  const columns = billTo ? 6 : 5;
  return (
    <>
      <ul className="divide-y divide-hairline border-t border-hairline sm:hidden">
        {rows.length === 0 ? (
          <li className="px-5 py-6 text-center text-sm text-muted">{empty}</li>
        ) : (
          rows.map((row) => (
            <li key={row.id}>
              <Link
                href={invoiceHref(row.id)}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-5 py-3 text-sm hover:bg-hover focus-ring"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">
                    {row.label}
                  </span>
                  <span className="block truncate text-caption text-muted">
                    {[
                      billTo ? row.billTo.name : null,
                      row.period ?? row.bookings[0],
                    ]
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
            <Th>Number</Th>
            {billTo ? <Th>Billed to</Th> : null}
            <Th>For</Th>
            <Th align="right">Total</Th>
            <Th align="right">Balance</Th>
            <Th>Due</Th>
            <Th>Status</Th>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={columns + 1}>{empty}</EmptyRow>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <Td className="whitespace-nowrap">
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
                        row.type === "credit"
                          ? `Credit note${row.credits ? ` on ${row.credits}` : ""}`
                          : row.issuedAt
                            ? formatLocalDate(row.issuedAt)
                            : `Made ${formatLocalDate(row.createdAt)}`
                      }
                    />
                  </Td>
                  {billTo ? (
                    <Td className="max-w-56">
                      <TwoLines
                        top={row.billTo.name || "–"}
                        bottom={row.billTo.businessId ? "Agent" : "Customer"}
                      />
                    </Td>
                  ) : null}
                  <Td className="max-w-56">
                    <TwoLines
                      top={row.period ?? row.bookings[0] ?? "–"}
                      bottom={
                        row.period || row.bookings.length > 1
                          ? `${row.bookings.length} ${row.bookings.length === 1 ? "booking" : "bookings"}`
                          : undefined
                      }
                    />
                  </Td>
                  <MoneyCell
                    sen={row.status === "draft" ? null : row.totalSen}
                  />
                  <MoneyCell
                    sen={row.money ? row.money.balanceSen : null}
                    strong
                  />
                  <Td className="whitespace-nowrap">
                    {row.dueAt &&
                    row.type === "invoice" &&
                    row.status === "issued" ? (
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
                    <span className="inline-flex gap-1.5">
                      {row.type === "credit" ? <Badge>Credit</Badge> : null}
                      <DocumentStateBadge
                        status={row.status}
                        money={row.money}
                      />
                    </span>
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
