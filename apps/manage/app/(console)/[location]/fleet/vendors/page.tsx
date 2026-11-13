import Link from "next/link";
import {
  isVendorKind,
  isVendorService,
  isMadeOrder,
  isVendorStatus,
  searchTermOf,
  textOf,
  VENDOR_KIND_LABELS,
  VENDOR_SERVICES,
  VENDOR_SERVICE_LABELS,
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  type MadeOrder,
} from "@repo/db";
import { listVendors } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import {
  FilterChips,
  ListFilters,
  type FilterGroup,
} from "../../../../_components/ListFilters";
import { AddedTd, AddedTh } from "../../../../_components/AddedColumn";
import { ListToolbar } from "../../../../_components/ListToolbar";
import { SearchBox } from "../../../../_components/SearchBox";
import { requireAdmin } from "../../../../_lib/access";
import {
  newVendorHref,
  SEARCH_PARAM,
  SORT_PARAM,
  vendorHref,
  vendorsHref,
} from "../../../../_lib/routes";
import { scopeOf, type ConsoleScope } from "../../../../_lib/scope";
import { VendorStatusBadge } from "@repo/console/StatusBadges";

/**
 * Route: /[location]/fleet/vendors?status=…&service=…&sort=…&q=…. The
 * vendors, ours first or by when each was added, narrowed by the Filters button to a status or what they
 * supply, and by a search:
 * every one under `~`, with the locations each serves, or those serving
 * the location under its slug; how many vehicles and drivers each has in
 * service, and where it stands. Those waiting for approval are SUPER's to
 * review. See docs/261028-fulfilment-vendors-and-connect.md.
 */
export default async function VendorsPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/vendors">) {
  await requireAdmin("fleet.manage");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  const status = isVendorStatus(query.status) ? query.status : undefined;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  const service = isVendorService(query.service) ? query.service : undefined;
  const sort = textOf(query[SORT_PARAM]);
  const order = isMadeOrder(sort) ? sort : undefined;
  const groups: FilterGroup[] = [
    {
      param: "status",
      label: "Status",
      value: status ?? "",
      options: VENDOR_STATUSES.map((value) => ({
        value,
        label: VENDOR_STATUS_LABELS[value],
      })),
    },
    {
      param: "service",
      label: "Supplies",
      value: service ?? "",
      options: VENDOR_SERVICES.map((value) => ({
        value,
        label: VENDOR_SERVICE_LABELS[value],
      })),
    },
  ];
  // The list as filtered: what each control changes a field of.
  const listed = vendorsHref(scope.slug, { status, service, sort: order, q });

  return (
    <>
      <PageHeader
        title="Vendors"
        action={
          <Button asChild>
            <Link href={newVendorHref(scope.slug)}>
              <PlusIcon />
              Add Vendor
            </Link>
          </Button>
        }
      />
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={vendorsHref(scope.slug, { status, service, sort: order })}
            value={q ?? ""}
            label="Search vendors"
            placeholder="Name, contact, phone or SSM"
          />
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        <FilterChips href={listed} groups={groups} />
        {/* Keyed by the filters, so another filter shows the skeleton, not the old rows. */}
        <Streamed
          key={listed}
          fallback={<TableSkeleton bare rows={4} columns={5} />}
        >
          {() => vendorRows(scope, { status, service, order, q })}
        </Streamed>
      </Card>
    </>
  );
}

async function vendorRows(
  scope: ConsoleScope,
  filter: {
    status?: (typeof VENDOR_STATUSES)[number];
    service?: (typeof VENDOR_SERVICES)[number];
    /** By when each was added; none for ours first, then by name. */
    order?: MadeOrder;
    q?: string;
  },
) {
  const vendors = await listVendors({
    status: filter.status,
    service: filter.service,
    search: filter.q,
    locationId: scope.location?.id,
    order: filter.order,
  });
  const showLocations = scope.location === null;
  const columns = showLocations ? 5 : 4;
  return (
    <Table bare>
      <THead>
        <Th>Vendor</Th>
        {showLocations ? <Th>Serves</Th> : null}
        <Th>In Service</Th>
        <AddedTh
          sort={{
            order: filter.order,
            hrefOf: (next) =>
              vendorsHref(scope.slug, {
                status: filter.status,
                service: filter.service,
                sort: next,
                q: filter.q,
              }),
          }}
        />
        <Th>Status</Th>
      </THead>
      <TBody>
        {vendors.length === 0 ? (
          <EmptyRow colSpan={columns}>
            {filter.q || filter.status || filter.service
              ? "No vendor matches. Clear the filters to see them all."
              : scope.location
                ? `No vendor serves ${scope.location.name} yet.`
                : "No vendor yet."}
          </EmptyRow>
        ) : (
          vendors.map((vendor) => (
            <tr key={vendor.id}>
              <Td className="whitespace-nowrap">
                <TwoLines
                  top={
                    <Link
                      href={vendorHref(scope.slug, vendor.id)}
                      className="underline-offset-4 hover:underline"
                    >
                      {vendor.name}
                    </Link>
                  }
                  bottom={`${
                    isVendorKind(vendor.kind)
                      ? VENDOR_KIND_LABELS[vendor.kind]
                      : vendor.kind
                  } · ${vendor.contactName} · ${vendor.contactPhone}`}
                />
              </Td>
              {showLocations ? (
                <Td className="min-w-40">
                  {vendor.locations.map((l) => l.name).join(", ") || "None"}
                </Td>
              ) : null}
              <Td className="whitespace-nowrap tabular-nums">
                {vendor._count.vehicles} vehicles · {vendor._count.drivers}{" "}
                drivers
              </Td>
              <AddedTd at={vendor.createdAt} />
              <Td className="whitespace-nowrap">
                <span className="inline-flex gap-1.5">
                  {vendor.isOurs ? <Badge tone="brand">Ours</Badge> : null}
                  <VendorStatusBadge status={vendor.status} />
                </span>
              </Td>
            </tr>
          ))
        )}
      </TBody>
    </Table>
  );
}
