import Link from "next/link";
import {
  isVendorStatus,
  searchTermOf,
  VENDOR_KIND_LABELS,
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  isVendorKind,
} from "@repo/db";
import { listVendors } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { FilterLinks } from "../../_components/FilterLinks";
import { PageHeader } from "@repo/console/PageHeader";
import { SearchBox } from "../../_components/SearchBox";
import { EmptyRow, Table, TBody, Td, Th, THead } from "@repo/console/Table";
import { requireAdmin } from "../../_lib/access";
import {
  NEW_VENDOR_PATH,
  SEARCH_PARAM,
  vendorHref,
  vendorsHref,
} from "../../_lib/routes";
import { VendorStatusBadge } from "./_components/VendorStatusBadge";

/**
 * Route: /vendors?status=…&q=…. Every vendor, ours first: who supplies
 * vehicles and drivers, the locations each serves and how many it has in
 * service. Those waiting for approval are SUPER's to review. See
 * docs/261028-fulfilment-vendors-and-connect.md.
 */
export default async function VendorsPage({
  searchParams,
}: PageProps<"/vendors">) {
  await requireAdmin("fleet.manage");
  const params = await searchParams;
  const status = isVendorStatus(params.status) ? params.status : undefined;
  const q = searchTermOf(params[SEARCH_PARAM]) ?? undefined;
  const vendors = await listVendors({ status, search: q });

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Who supplies our vehicles and drivers, Heavenly Travel included. Vendors sign up in Connect; you can also add one here."
        action={
          <Button asChild>
            <Link href={NEW_VENDOR_PATH}>Add vendor</Link>
          </Button>
        }
      />
      <div className="mt-6 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterLinks
            label="Filter by status"
            options={VENDOR_STATUSES.map((value) => ({
              value,
              label: VENDOR_STATUS_LABELS[value],
            }))}
            active={status}
            hrefOf={(next) => vendorsHref({ status: next, q })}
          />
          <SearchBox
            href={vendorsHref({ status })}
            value={q ?? ""}
            label="Search vendors"
            placeholder="Name, contact, phone or SSM"
          />
        </div>
        <Table>
          <THead>
            <Th>Vendor</Th>
            <Th>Serves</Th>
            <Th>In service</Th>
            <Th>Status</Th>
          </THead>
          <TBody>
            {vendors.length === 0 ? (
              <EmptyRow colSpan={4}>
                {q || status
                  ? "No vendor matches. Clear the filter to see them all."
                  : "No vendor yet."}
              </EmptyRow>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <Td className="whitespace-nowrap">
                    <Link
                      href={vendorHref(vendor.id)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {vendor.name}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {isVendorKind(vendor.kind)
                        ? VENDOR_KIND_LABELS[vendor.kind]
                        : vendor.kind}{" "}
                      · {vendor.contactName} · {vendor.contactPhone}
                    </span>
                  </Td>
                  <Td className="min-w-40 text-slate-600">
                    {vendor.locations.map((l) => l.name).join(", ") || "None"}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600 tabular-nums">
                    {vendor._count.vehicles} vehicles · {vendor._count.drivers}{" "}
                    drivers
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="inline-flex gap-1.5">
                      {vendor.isOurs ? <Badge tone="blue">Ours</Badge> : null}
                      <VendorStatusBadge status={vendor.status} />
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
