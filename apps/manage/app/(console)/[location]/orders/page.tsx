import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatLocalDate,
  isMadeOrder,
  isPaymentState,
  madeDirectionOf,
  nextMadeOrder,
  PAYMENT_STATES,
  PAYMENT_STATE_LABELS,
  searchTermOf,
  textOf,
  type MadeOrder,
} from "@repo/db";
import { listOrders, type OrderFilter, type OrderRow } from "@repo/db/server";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import {
  BookingStatusBadge,
  PaymentStateBadge,
} from "@repo/console/StatusBadges";
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
import { MoneyCell } from "../../../_components/InvoiceTable";
import {
  FilterChips,
  ListFilters,
  type FilterGroup,
} from "../../../_components/ListFilters";
import { ListToolbar } from "../../../_components/ListToolbar";
import { Pager } from "../../../_components/Pager";
import { SearchBox } from "../../../_components/SearchBox";
import { requireAdmin } from "../../../_lib/access";
import {
  bookingHref,
  invoiceHref,
  ordersHref,
  PAGE_PARAM,
  SEARCH_PARAM,
  SORT_PARAM,
  type OrdersListFilter,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";

const PAGE_SIZE = 50;

/**
 * Route: /~/orders?billed=…&state=…&sort=oldest&q=…&page=2. The Order
 * List: every booking, the newest made first (the Booking heading turns
 * it), as Account reads it: who it is
 * for and through which agent, its status, its total, the invoices it is
 * on, what was paid and what is left. A booking on an agent's month-end
 * invoice shows its own share of it: its amount and the payments for it.
 * Filters narrow it to customers' or agents' bookings and to a payment
 * state; the search finds an HTB number, a customer or an agent.
 * Finance's (`invoices.manage`). Console-wide.
 */
export default async function OrdersPage({
  params,
  searchParams,
}: PageProps<"/[location]/orders">) {
  await requireAdmin("invoices.manage");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  if (scope.slug !== null) notFound();
  const billed = textOf(query.billed);
  const filter: OrdersListFilter = {
    billed: billed === "customer" || billed === "agent" ? billed : undefined,
    state: isPaymentState(query.state) ? query.state : undefined,
    sort: textOf(query[SORT_PARAM]) === "oldest" ? "oldest" : undefined,
    q: searchTermOf(query[SEARCH_PARAM]) ?? undefined,
  };
  const page = Math.max(1, Number(textOf(query[PAGE_PARAM])) || 1);
  const groups: FilterGroup[] = [
    {
      param: "billed",
      label: "Billed",
      value: filter.billed ?? "",
      options: [
        { value: "customer", label: "Customer" },
        { value: "agent", label: "Agent" },
      ],
    },
    {
      param: "state",
      label: "Payment",
      value: filter.state ?? "",
      options: PAYMENT_STATES.map((value) => ({
        value,
        label: PAYMENT_STATE_LABELS[value],
      })),
    },
  ];
  const listed = ordersHref(filter);

  return (
    <>
      <PageHeader title="Order List" />
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={ordersHref({ ...filter, q: undefined })}
            value={filter.q ?? ""}
            label="Search orders"
            placeholder="HTB number, customer or agent"
          />
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        <FilterChips href={listed} groups={groups} />
        <Streamed
          key={`${listed}:${page}`}
          fallback={<TableSkeleton bare rows={8} columns={7} />}
        >
          {() => orderRows(filter, page)}
        </Streamed>
      </Card>
    </>
  );
}

function filterOf(filter: OrdersListFilter): OrderFilter {
  return {
    billed:
      filter.billed === "customer" || filter.billed === "agent"
        ? filter.billed
        : undefined,
    state: isPaymentState(filter.state) ? filter.state : undefined,
    order: isMadeOrder(filter.sort) ? filter.sort : undefined,
    search: filter.q,
  };
}

async function orderRows(filter: OrdersListFilter, page: number) {
  const rows = await listOrders(filterOf(filter));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const narrowed = Object.entries(filter).some(
    ([key, value]) => key !== "sort" && Boolean(value),
  );
  const order = isMadeOrder(filter.sort) ? filter.sort : undefined;
  return (
    <>
      <OrderTable
        rows={shown}
        order={order}
        hrefOf={(next) =>
          ordersHref({
            ...filter,
            sort: next === "newest" ? undefined : next,
            page: undefined,
          })
        }
        empty={
          narrowed
            ? "No booking matches. Clear the filters to see them all."
            : "No booking yet."
        }
      />
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={rows.length}
        hrefOf={(next) => ordersHref({ ...filter, page: next })}
      />
    </>
  );
}

/** Where a booking's money stands, on its own invoices or its share of the agent's month-end one. */
function StateOf({ row }: { row: OrderRow }) {
  const money = row.money;
  if (!money) {
    return (
      <span className="text-caption text-muted">
        {row.status === "received" ? "Not Confirmed" : "Not Invoiced"}
      </span>
    );
  }
  return <PaymentStateBadge state={money.state} />;
}

/**
 * The bookings in a table, a row each: the booking and its first
 * pick-up, who it is for, its status, its total, its invoices, what was
 * paid and what is left (its share only, on an agent's month-end
 * invoice), and where it stands.
 */
function OrderTable({
  rows,
  empty,
  order,
  hrefOf,
}: {
  rows: readonly OrderRow[];
  empty: string;
  /** By when each was made; none for the newest first. */
  order: MadeOrder | undefined;
  hrefOf: (order: MadeOrder) => string;
}) {
  return (
    <Table bare>
      <THead>
        <SortTh
          href={hrefOf(nextMadeOrder(order, "newest"))}
          direction={madeDirectionOf(order, "newest")}
        >
          Booking
        </SortTh>
        <Th>For</Th>
        <Th>Status</Th>
        <Th align="right">Total</Th>
        <Th>Invoice</Th>
        <Th align="right">Paid</Th>
        <Th align="right">Balance</Th>
        <Th>Payment</Th>
      </THead>
      <TBody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={8}>{empty}</EmptyRow>
        ) : (
          rows.map((row) => (
            <tr key={row.id}>
              <Td className="whitespace-nowrap">
                <TwoLines
                  top={
                    <Link
                      href={bookingHref(null, row.id)}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {row.label}
                    </Link>
                  }
                  bottom={formatLocalDate(row.startsAt)}
                />
              </Td>
              <Td className="max-w-56">
                <TwoLines
                  top={row.contactName}
                  bottom={row.agent ? `Agent · ${row.agent}` : "Customer"}
                />
              </Td>
              <Td>
                <BookingStatusBadge status={row.status} />
              </Td>
              <MoneyCell sen={row.chargedSen} />
              <Td className="whitespace-nowrap">
                {row.documents.length === 0 ? (
                  <span className="text-muted">–</span>
                ) : (
                  <span className="grid gap-0.5">
                    {row.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={invoiceHref(doc.id)}
                        className="underline-offset-4 hover:underline"
                      >
                        {doc.label}
                        {doc.monthEnd ? (
                          <span className="text-caption text-muted">
                            {" "}
                            month-end
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </span>
                )}
              </Td>
              <MoneyCell sen={row.money ? row.money.paidSen : null} />
              <MoneyCell sen={row.money ? row.money.balanceSen : null} strong />
              <Td className="whitespace-nowrap">
                <StateOf row={row} />
              </Td>
            </tr>
          ))
        )}
      </TBody>
    </Table>
  );
}
