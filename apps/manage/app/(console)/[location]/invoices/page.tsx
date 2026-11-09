import { notFound } from "next/navigation";
import {
  formatMyr,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  INVOICE_TYPES,
  INVOICE_TYPE_LABELS,
  isInvoiceStatus,
  isInvoiceType,
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
 * Route: /~/invoices?type=…&status=…&state=…&agent=…&overdue=1&q=…&page=2.
 * Finance's list of every invoice, credit note and month-end draft of the
 * new series, newest first: who each is billed to, what it is for, its
 * total, what is left to pay, when it is due and where it stands. Tiles
 * at the head count what Finance works on and narrow the list to it; the
 * Filters narrow it to a type, a step, a payment state or an agent; the
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
    q: searchTermOf(query[SEARCH_PARAM]) ?? undefined,
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
      options: PAYMENT_STATES.map((value) => ({
        value,
        label: PAYMENT_STATE_LABELS[value],
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
    search: filter.q,
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
  const drafts = all.filter((row) => row.status === "draft").length;
  return (
    <FigureTiles
      label="Invoices by payment"
      figures={[
        ...figures,
        {
          key: "drafts",
          label: "Drafts to issue",
          value: String(drafts),
          tone: "amber",
          href: invoicesHref(
            filter.status === "draft"
              ? { ...filter, status: undefined }
              : {
                  ...filter,
                  status: "draft",
                  state: undefined,
                  overdue: undefined,
                },
          ),
          current: filter.status === "draft",
        },
      ]}
    />
  );
}

async function invoiceRows(filter: InvoicesListFilter, page: number) {
  const rows = await listInvoices(filterOf(filter));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const narrowed = Object.values(filter).some(Boolean);
  return (
    <>
      <InvoiceTable
        rows={shown}
        empty={
          narrowed
            ? "No invoice matches. Clear the filters to see them all."
            : "No invoice yet. Confirming a booking issues its invoice; a credit agent's are made by the month-end run."
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
