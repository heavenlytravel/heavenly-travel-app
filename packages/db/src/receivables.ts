import { bookingLabelOf, documentLabelOf } from "./booking-number";
import {
  isCredit,
  paysLater,
  sumMoney,
  withPayLater,
  type InvoiceMoney,
  type PaymentState,
} from "./billing-rules";
import { DOCUMENT_MONEY, moneyOf, periodOfRow } from "./billing";
import { db } from "./client";
import type { MadeOrder } from "./list-order";

/**
 * Account's view of the money by booking, besides the invoices: the Order
 * List. Read only; every amount comes
 * from the invoices and payments (./billing). Hundreds of rows, not
 * millions: worked out here, then narrowed and paged by the caller.
 */

/** One booking as the Order List shows it. */
export type OrderRow = {
  id: string;
  label: string;
  contactName: string;
  /** The agent it came through; null for our own customer. */
  agent: string | null;
  startsAt: Date;
  status: string;
  chargedSen: number;
  /** Its invoices and credit notes, not void: "HTI-0012". */
  documents: { id: string; label: string; status: string; monthEnd: boolean }[];
  /**
   * Its money on every invoice it is on, its own or its agent's month-end
   * one, this booking's share only; null before any (not confirmed yet).
   */
  money: InvoiceMoney | null;
};

export type OrderFilter = {
  /** HTB number, or who it is for. */
  search?: string;
  billed?: "customer" | "agent";
  state?: PaymentState;
  /** By when each was made; the newest first unless the oldest. */
  order?: MadeOrder;
};

/** Every booking, the newest made first unless the oldest, with what is billed, paid and left on it. */
export async function listOrders(
  filter: OrderFilter = {},
  now: Date = new Date(),
): Promise<OrderRow[]> {
  const search = filter.search?.trim();
  const number = search ? /(\d{1,7})\s*$/.exec(search)?.[1] : undefined;
  const bookings = await db.booking.findMany({
    where: {
      ...(filter.billed === "customer" ? { businessId: null } : {}),
      ...(filter.billed === "agent" ? { businessId: { not: null } } : {}),
      ...(search
        ? {
            OR: [
              ...(number ? [{ number: Number(number) }] : []),
              {
                contactName: { contains: search, mode: "insensitive" as const },
              },
              {
                business: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: filter.order === "oldest" ? "asc" : "desc" },
    select: {
      id: true,
      number: true,
      contactName: true,
      startsAt: true,
      status: true,
      priceTotalSen: true,
      payLaterDueOn: true,
      business: { select: { name: true, paymentTerms: true } },
      invoiceLines: { select: { invoice: { select: DOCUMENT_MONEY } } },
    },
  });
  const rows = bookings.map((booking): OrderRow => {
    const docs = booking.invoiceLines
      .map((l) => l.invoice)
      .filter((d) => d.status !== "void");
    const monthly =
      !docs.some((d) => d.type === "invoice" && periodOfRow(d) === null) &&
      (booking.business ? isCredit(booking.business.paymentTerms) : false);
    const money = sumMoney(
      docs.flatMap((d) => {
        const share = moneyOf(d, now, booking.id);
        return share ? [share] : [];
      }),
      now,
    );
    return {
      id: booking.id,
      label: bookingLabelOf(booking),
      contactName: booking.contactName,
      agent: booking.business?.name ?? null,
      startsAt: booking.startsAt,
      status: booking.status,
      chargedSen: booking.priceTotalSen,
      documents: docs.map((d) => ({
        id: d.id,
        label: documentLabelOf(d),
        status: d.status,
        monthEnd: periodOfRow(d) !== null,
      })),
      money: money
        ? withPayLater(
            money,
            paysLater({ payLaterDueOn: booking.payLaterDueOn, monthly }),
          )
        : null,
    };
  });
  return filter.state
    ? rows.filter((row) => row.money?.state === filter.state)
    : rows;
}
