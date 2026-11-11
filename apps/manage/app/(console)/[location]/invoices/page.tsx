import { notFound } from "next/navigation";
import {
  formatMyr,
  INVOICE_BILLED,
  INVOICE_BILLED_LABELS,
  INVOICE_ISSUED_LABELS,
  INVOICE_ISSUED_WHEN,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  INVOICE_TYPES,
  INVOICE_TYPE_LABELS,
  isInvoiceBilled,
  isInvoiceIssuedWhen,
  isInvoiceStatus,
  isInvoiceType,
  isMadeOrder,
  isPaymentState,
  PAYMENT_STATES,
  PAYMENT_STATE_LABELS,
  searchTermOf,
  textOf,
} from "@repo/db";
import {
  listAgentNames,
  listInvoices,
  type InvoiceFilter,
} from "@repo/db/server";
import { Card } from "@repo/console/Card";
import { FigureTiles } from "@repo/console/FigureTiles";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { PAYMENT_STATE_TONES } from "@repo/console/StatusBadges";
import { InvoiceTable } from "../../../_components/InvoiceTable";
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
  invoicesHref,
  PAGE_PARAM,
  SEARCH_PARAM,
  SORT_PARAM,
  type InvoicesListFilter,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";

const PAGE_SIZE = 50;

/** The states a tile counts at the head, the ones Finance works on. */
const TILE_STATES = [
  "unpaid",
  "overdue",
  "partially-paid",
  "refund-due",
] as const;

/**
 * Route: /~/invoices?type=…&status=…&state=…&billed=…&issued=…&agent=…&overdue=1&q=…&page=2.
 * Finance's list of every invoice and credit note of the
 * new series, newest first: who each is billed to, what it is for, its
 * total, what is left to pay, when it is due and where it stands. Tiles
 * at the head count what Finance works on and narrow the list to it; the
 * Filters narrow it to a type, a step, a payment state, who it bills,
 * when it was issued or an agent; a credit note sits under its invoice; the
 * search finds an HTI, HTC or HTB number, or who it is billed to.
 * Finance's (`invoices.manage`). Console-wide.
 */
export default async function InvoicesPage({
  params,
  searchParams,
}: PageProps<"/[location]/invoices">) {
  await requireAdmin("invoices.manage");
  const [scope, query, agents] = await Promise.all([
    scopeOf(params),
    searchParams,
    listAgentNames(),
  ]);
  if (scope.slug !== null) notFound();
  const agentParam = textOf(query.agent);
  const filter: InvoicesListFilter = {
    type: isInvoiceType(query.type) ? query.type : undefined,
    status: isInvoiceStatus(query.status) ? query.status : undefined,
    state: isPaymentState(query.state) ? query.state : undefined,
    agent: agents.some((a) => a.id === agentParam) ? agentParam : undefined,
    overdue: textOf(query.overdue) === "1" ? "1" : undefined,
    billed: isInvoiceBilled(query.billed) ? query.billed : undefined,
    issued: isInvoiceIssuedWhen(query.issued) ? query.issued : undefined,
    q: searchTermOf(query[SEARCH_PARAM]) ?? undefined,
    sort: textOf(query[SORT_PARAM]) === "oldest" ? "oldest" : undefined,
  };
  const page = Math.max(1, Number(textOf(query[PAGE_PARAM])) || 1);
  const groups: FilterGroup[] = [
    {
      param: "type",
      label: "Type",
      value: filter.type ?? "",
      options: INVOICE_TYPES.map((value) => ({
        value,
        label: INVOICE_TYPE_LABELS[value],
      })),
    },
    {
      param: "status",
      label: "Step",
      value: filter.status ?? "",
      options: INVOICE_STATUSES.map((value) => ({
        value,
        label: INVOICE_STATUS_LABELS[value],
      })),
    },
    {
      param: "state",
      label: "Payment",
      value: filter.state ?? "",
      options: PAYMENT_STATES.filter((value) => value !== "pay-later").map(
        (value) => ({
          value,
          label: PAYMENT_STATE_LABELS[value],
        }),
      ),
    },
    {
      param: "billed",
      label: "Billed",
      value: filter.billed ?? "",
      options: INVOICE_BILLED.map((value) => ({
        value,
        label: INVOICE_BILLED_LABELS[value],
      })),
    },
    {
      param: "issued",
      label: "Issued",
      value: filter.issued ?? "",
      options: INVOICE_ISSUED_WHEN.map((value) => ({
        value,
        label: INVOICE_ISSUED_LABELS[value],
      })),
    },
    {
      param: "agent",
      label: "Agent",
      value: filter.agent ?? "",
      options: agents.map((a) => ({ value: a.id, label: a.name })),
    },
  ];
  const listed = invoicesHref(filter);

  return (
    <>
      <PageHeader title="Invoices" />
      <Streamed
        key={`tiles:${listed}`}
        fallback={<div className="mb-5 h-24" />}
      >
        {() => tiles(filter)}
      </Streamed>
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={invoicesHref({ ...filter, q: undefined })}
            value={filter.q ?? ""}
            label="Search invoices"
            placeholder="HTI, HTC or HTB number, or who it is billed to"
          />
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        <FilterChips href={listed} groups={groups} />
        <Streamed
          key={`${listed}:${page}`}
          fallback={<TableSkeleton bare rows={6} columns={7} />}
        >
          {() => invoiceRows(filter, page)}
        </Streamed>
      </Card>
    </>
  );
}

function filterOf(filter: InvoicesListFilter): InvoiceFilter {
  return {
    type: isInvoiceType(filter.type) ? filter.type : undefined,
    status: isInvoiceStatus(filter.status) ? filter.status : undefined,
    state: isPaymentState(filter.state) ? filter.state : undefined,
    businessId: filter.agent,
    overdue: filter.overdue === "1",
    billed: isInvoiceBilled(filter.billed) ? filter.billed : undefined,
    issued: isInvoiceIssuedWhen(filter.issued) ? filter.issued : undefined,
    search: filter.q,
    order: isMadeOrder(filter.sort) ? filter.sort : undefined,
  };
}

/** The tiles: what is owed and waiting, overdue, partly paid and due back, each a link to the list narrowed to it. */
async function tiles(filter: InvoicesListFilter) {
  const all = await listInvoices({ businessId: filter.agent });
  const figures = TILE_STATES.map((state) => {
    const rows = all.filter((row) =>
      state === "overdue" ? row.money?.overdue : row.money?.state === state,
    );
    const owed = rows.reduce(
      (sum, row) => sum + (row.money?.balanceSen ?? 0),
      0,
    );
    const narrowed =
      state === "overdue"
        ? { ...filter, overdue: "1", state: undefined }
        : { ...filter, state, overdue: undefined };
    const current =
      state === "overdue" ? filter.overdue === "1" : filter.state === state;
    return {
      key: state,
      label: `${PAYMENT_STATE_LABELS[state]} · ${rows.length}`,
      value: formatMyr(Math.abs(owed)),
      tone: PAYMENT_STATE_TONES[state],
      href: invoicesHref(
        current
          ? { ...narrowed, state: undefined, overdue: undefined }
          : narrowed,
      ),
      current,
    };
  });
  // Open month-end invoices whose period has ended: Finance issues them.
  const ready = all.filter((row) => row.ready).length;
  const readyFilter = filter.status === "open" && filter.billed === "month-end";
  return (
    <FigureTiles
      label="Invoices by payment"
      figures={[
        ...figures,
        {
          key: "ready",
          label: "Month-end to issue",
          value: String(ready),
          tone: "amber",
          href: invoicesHref(
            readyFilter
              ? { ...filter, status: undefined, billed: undefined }
              : {
                  ...filter,
                  status: "open",
                  billed: "month-end",
                  state: undefined,
                  overdue: undefined,
                },
          ),
          current: readyFilter,
        },
      ]}
    />
  );
}

async function invoiceRows(filter: InvoicesListFilter, page: number) {
  const rows = await listInvoices(filterOf(filter));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const narrowed = Object.entries(filter).some(
    ([key, value]) => key !== "sort" && Boolean(value),
  );
  return (
    <>
      <InvoiceTable
        rows={shown}
        sort={{
          order: isMadeOrder(filter.sort) ? filter.sort : undefined,
          hrefOf: (order) =>
            invoicesHref({
              ...filter,
              sort: order === "newest" ? undefined : order,
              page: undefined,
            }),
        }}
        empty={
          narrowed
            ? "No invoice matches. Clear the filters to see them all."
            : "No invoice yet. Confirming a booking opens its invoice; a credit agent's bookings go on its month-end invoice."
        }
      />
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={rows.length}
        hrefOf={(next) => invoicesHref({ ...filter, page: next })}
      />
    </>
  );
}
