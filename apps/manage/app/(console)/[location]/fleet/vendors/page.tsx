import Link from "next/link";
import {
  isVendorKind,
  isVendorStatus,
  searchTermOf,
  VENDOR_KIND_LABELS,
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
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
import { FilterLinks } from "../../../../_components/FilterLinks";
import { ListToolbar } from "../../../../_components/ListToolbar";
import { SearchBox } from "../../../../_components/SearchBox";
import { requireAdmin } from "../../../../_lib/access";
import {
  newVendorHref,
  SEARCH_PARAM,
  vendorHref,
  vendorsHref,
} from "../../../../_lib/routes";
import { scopeOf, type ConsoleScope } from "../../../../_lib/scope";
import { VendorStatusBadge } from "@repo/console/StatusBadges";

/**
 * Route: /[location]/fleet/vendors?status=…&q=…. The vendors, ours first:
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

  return (
    <>
      <PageHeader
        title="Vendors"
        action={
          <Button asChild>
            <Link href={newVendorHref(scope.slug)}>
              <PlusIcon />
              Add vendor
            </Link>
          </Button>
        }
      />
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={vendorsHref(scope.slug, { status })}
            value={q ?? ""}
            label="Search vendors"
            placeholder="Name, contact, phone or SSM"
          />
          <FilterLinks
            label="Filter by status"
            options={VENDOR_STATUSES.map((value) => ({
              value,
              label: VENDOR_STATUS_LABELS[value],
            }))}
            active={status}
            hrefOf={(next) => vendorsHref(scope.slug, { status: next, q })}
          />
        </ListToolbar>
        {/* Keyed by the filters, so another filter shows the skeleton, not the old rows. */}
        <Streamed
          key={`${scope.slug ?? "~"}:${status ?? ""}:${q ?? ""}`}
          fallback={<TableSkeleton bare rows={4} columns={4} />}
        >
          {() => vendorRows(scope, { status, q })}
        </Streamed>
      </Card>
    </>
  );
}

async function vendorRows(
  scope: ConsoleScope,
  filter: { status?: (typeof VENDOR_STATUSES)[number]; q?: string },
) {
  const vendors = await listVendors({
    status: filter.status,
    search: filter.q,
    locationId: scope.location?.id,
  });
  const showLocations = scope.location === null;
  const columns = showLocations ? 4 : 3;
  return (
    <Table bare>
      <THead>
        <Th>Vendor</Th>
        {showLocations ? <Th>Serves</Th> : null}
        <Th>In service</Th>
        <Th>Status</Th>
      </THead>
      <TBody>
        {vendors.length === 0 ? (
          <EmptyRow colSpan={columns}>
            {filter.q || filter.status
              ? "No vendor matches. Clear the filter to see them all."
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
