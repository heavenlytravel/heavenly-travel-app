import Link from "next/link";
import {
  formatLocalDate,
  formatMyr,
  isPaymentMethod,
  madeDirectionOf,
  nextMadeOrder,
  PAYMENT_METHOD_LABELS,
  type MadeOrder,
} from "@repo/db";
import {
  EmptyRow,
  SortTh,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import { cx } from "@repo/ui/cx";
import { MoneyCell } from "../../../../_components/InvoiceTable";
import { bookingHref, invoiceHref } from "../../../../_lib/routes";
import { ReversePaymentControl } from "./PaymentControls";

/** One payment in or refund out, as the table lists it. */
export type ListedPayment = {
  id: string;
  /** Below nothing for a refund. */
  amountSen: number;
  method: string;
  paidAt: Date;
  note: string | null;
  reversedAt: Date | null;
  reverseReason: string | null;
  /** The document it is on, where the list spans several; left out on the document's own page. */
  document?: { id: string; label: string };
  /** The booking it is for, where the document has several. */
  booking?: { id: string; label: string };
};

/**
 * Payments and refunds, a row each: the day, how, the booking it is for
 * on a document of several, the document it is on where the list spans a
 * booking's, the note or why it was reversed, and the amount. A reversed
 * one stays, struck out. Finance (`reversible`) reverses one entered
 * wrong. With `sort`, the Day heading turns the order, the oldest first
 * by default. `compact`, for a side column, puts the day under how it
 * was paid instead of a column of its own.
 */
export function PaymentsTable({
  payments,
  reversible,
  empty,
  sort,
  compact = false,
}: {
  payments: readonly ListedPayment[];
  reversible: boolean;
  /** What an empty list says: "Nothing paid yet." */
  empty: string;
  sort?: { order: MadeOrder | undefined; hrefOf: (order: MadeOrder) => string };
  compact?: boolean;
}) {
  const columns = compact ? 3 : 4;
  return (
    <Table bare>
      <THead>
        {compact ? null : sort ? (
          <SortTh
            href={sort.hrefOf(nextMadeOrder(sort.order, "oldest"))}
            direction={madeDirectionOf(sort.order, "oldest")}
          >
            Day
          </SortTh>
        ) : (
          <Th>Day</Th>
        )}
        <Th>Payment</Th>
        <Th align="right">Amount</Th>
        <Th />
      </THead>
      <TBody>
        {payments.length === 0 ? (
          <EmptyRow colSpan={columns}>{empty}</EmptyRow>
        ) : (
          payments.map((payment) => (
            <tr
              key={payment.id}
              className={cx(payment.reversedAt && "text-muted line-through")}
            >
              {compact ? null : (
                <Td className="whitespace-nowrap text-body">
                  {formatLocalDate(payment.paidAt)}
                </Td>
              )}
              <Td>
                <TwoLines
                  top={
                    <>
                      {payment.amountSen < 0 ? "Refund · " : null}
                      {isPaymentMethod(payment.method)
                        ? PAYMENT_METHOD_LABELS[payment.method]
                        : payment.method}
                      {payment.booking ? (
                        <>
                          {" · "}
                          <Link
                            href={bookingHref(null, payment.booking.id)}
                            className="underline-offset-4 hover:underline"
                          >
                            {payment.booking.label}
                          </Link>
                        </>
                      ) : null}
                      {payment.document ? (
                        <>
                          {" · "}
                          <Link
                            href={invoiceHref(payment.document.id)}
                            className="underline-offset-4 hover:underline"
                          >
                            {payment.document.label}
                          </Link>
                        </>
                      ) : null}
                    </>
                  }
                  bottom={[
                    compact ? formatLocalDate(payment.paidAt) : null,
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
                {!payment.reversedAt && reversible ? (
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
  );
}
