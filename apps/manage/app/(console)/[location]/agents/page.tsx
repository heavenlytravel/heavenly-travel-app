import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BUSINESS_STATUSES,
  BUSINESS_STATUS_LABELS,
  isBusinessStatus,
  isMadeOrder,
  isPaymentTerms,
  PAYMENT_TERMS_LABELS,
  searchTermOf,
  textOf,
  type MadeOrder,
} from "@repo/db";
import { listBusinesses } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { BusinessStatusBadge } from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import { AddedTd, AddedTh } from "../../../_components/AddedColumn";
import {
  FilterChips,
  ListFilters,
  type FilterGroup,
} from "../../../_components/ListFilters";
import { ListToolbar } from "../../../_components/ListToolbar";
import { SearchBox } from "../../../_components/SearchBox";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  agentHref,
  agentsHref,
  NEW_AGENT_HREF,
  SEARCH_PARAM,
  SORT_PARAM,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";

/**
 * Route: /~/agents?status=…&q=…. The agents we sell through, active first:
 * each with who the team speaks to, its payment terms and days to pay,
 * and where it stands. Every team that sees bookings reads it; those who
 * enter bookings, and Finance, add one. Console-wide. See
 * docs/261108-billing-and-revisions.md, "Screens".
 */
export default async function AgentsPage({
  params,
  searchParams,
}: PageProps<"/[location]/agents">) {
  await requireAdmin("bookings.view");
  const [scope, query, permissions] = await Promise.all([
    scopeOf(params),
    searchParams,
    getPermissions(),
  ]);
  if (scope.slug !== null) notFound();
  const status = isBusinessStatus(query.status) ? query.status : undefined;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  const sort = textOf(query[SORT_PARAM]);
  const order = isMadeOrder(sort) ? sort : undefined;
  const groups: FilterGroup[] = [
    {
      param: "status",
      label: "Status",
      value: status ?? "",
      options: BUSINESS_STATUSES.map((value) => ({
        value,
        label: BUSINESS_STATUS_LABELS[value],
      })),
    },
  ];
  const listed = agentsHref({ status, sort: order, q });

  return (
    <>
      <PageHeader
        title="Agents"
        action={
          permissions.includes("agents.manage") ? (
            <Button asChild>
              <Link href={NEW_AGENT_HREF}>
                <PlusIcon />
                Add Agent
              </Link>
            </Button>
          ) : null
        }
      />
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={agentsHref({ status, sort: order })}
            value={q ?? ""}
            label="Search agents"
            placeholder="Name, contact or email"
          />
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        <FilterChips href={listed} groups={groups} />
        <Streamed
          key={listed}
          fallback={<TableSkeleton bare rows={4} columns={4} />}
        >
          {() => agentRows({ status, order, q })}
        </Streamed>
      </Card>
    </>
  );
}

async function agentRows(filter: {
  status?: (typeof BUSINESS_STATUSES)[number];
  /** By when each was added; none for active first, then by name. */
  order?: MadeOrder;
  q?: string;
}) {
  const agents = await listBusinesses({
    status: filter.status,
    order: filter.order,
    search: filter.q,
  });
  return (
    <Table bare>
      <THead>
        <Th>Agent</Th>
        <Th>Payment Terms</Th>
        <AddedTh
          sort={{
            order: filter.order,
            hrefOf: (sort) =>
              agentsHref({ status: filter.status, sort, q: filter.q }),
          }}
        />
        <Th>Status</Th>
      </THead>
      <TBody>
        {agents.length === 0 ? (
          <EmptyRow colSpan={4}>
            {filter.q || filter.status
              ? "No agent matches. Clear the filters to see them all."
              : "No agent yet. Add one, or from New booking."}
          </EmptyRow>
        ) : (
          agents.map((agent) => (
            <tr key={agent.id}>
              <Td>
                <TwoLines
                  top={
                    <Link
                      href={agentHref(agent.id)}
                      className="underline-offset-4 hover:underline"
                    >
                      {agent.name}
                    </Link>
                  }
                  bottom={`${agent.contactName} · ${agent.contactPhone}`}
                />
              </Td>
              <Td className="whitespace-nowrap">
                <TwoLines
                  top={
                    isPaymentTerms(agent.paymentTerms)
                      ? PAYMENT_TERMS_LABELS[agent.paymentTerms]
                      : agent.paymentTerms
                  }
                  bottom={`${agent.daysToPay} days to pay`}
                />
              </Td>
              <AddedTd at={agent.createdAt} />
              <Td className="whitespace-nowrap">
                <BusinessStatusBadge status={agent.status} />
              </Td>
            </tr>
          ))
        )}
      </TBody>
    </Table>
  );
}
