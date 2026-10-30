import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isVendorStatus,
  VENDOR_SERVICE_LABELS,
  vendorServicesOf,
} from "@repo/db";
import {
  getVendor,
  heldBookingsOf,
  listActivityFor,
  listDrivers,
  listVehicles,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Card, CardTitle } from "@repo/console/Card";
import { DriversTable } from "../../../_components/DriversTable";
import { HistoryTimeline } from "../../../_components/HistoryTimeline";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import { SectionHeader } from "@repo/console/SectionHeader";
import { FormSkeleton, Streamed } from "@repo/console/Skeleton";
import { VehiclesTable } from "../../../_components/VehiclesTable";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { locationNames } from "../../../_lib/location-names";
import {
  newVendorDriverHref,
  newVendorVehicleHref,
  VENDORS_PATH,
} from "../../../_lib/routes";
import { heldBookingsSentence } from "@repo/console/held-bookings";
import { VendorForm } from "../_components/VendorForm";
import { VendorReview } from "../_components/VendorReview";
import { VendorStatusBadge } from "../_components/VendorStatusBadge";

/**
 * Route: /vendors/[id], and /vendors/new. A vendor's details, its
 * vehicles and drivers, which Operation keeps for one not on Connect, and
 * its history; for SUPER, its review and the "Ours" switch. See
 * docs/261028-fulfilment-vendors-and-connect.md.
 */
export default async function VendorPage({
  params,
}: PageProps<"/vendors/[id]">) {
  await requireAdmin("fleet.manage");
  const { id } = await params;
  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={VENDORS_PATH}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All vendors
        </Link>
      </p>
      <Streamed
        fallback={
          <DetailColumns main={<FormSkeleton sections={3} fields={4} />} />
        }
      >
        {() => (id === "new" ? newVendor() : vendorScreen(id))}
      </Streamed>
    </>
  );
}

async function newVendor() {
  const locations = await locationNames();
  return (
    <>
      <PageHeader
        title="Add vendor"
        description="A vendor not on Connect, or one that never signs in: active at once. Its vehicles and drivers are added from its page."
      />
      <DetailColumns
        main={<VendorForm locations={locations} backHref={VENDORS_PATH} />}
      />
    </>
  );
}

async function vendorScreen(id: string) {
  const [vendor, locations, permissions] = await Promise.all([
    getVendor(id),
    locationNames(),
    getPermissions(),
  ]);
  if (!vendor) notFound();
  const [vehicles, drivers, history] = await Promise.all([
    listVehicles({ vendorId: id }),
    listDrivers({ vendorId: id }),
    listActivityFor("vendor", id),
  ]);
  const status = isVendorStatus(vendor.status) ? vendor.status : "pending";
  const reviews = permissions.includes("vendors.review");
  // What suspending takes it off, read for SUPER while it can be suspended.
  const held =
    reviews && status === "active"
      ? await heldBookingsOf({ vendorId: id })
      : [];

  return (
    <>
      <PageHeader
        title={vendor.name}
        badge={<VendorStatusBadge status={vendor.status} />}
        description={
          vendor.isOurs
            ? "Ours: no cost, Operation accepts its jobs, and its vehicles reach the website."
            : vendorServicesOf(vendor.services)
                .map((s) => VENDOR_SERVICE_LABELS[s])
                .join(", ")
        }
      />
      <DetailColumns
        main={
          <>
            <VendorForm
              key={vendor.updatedAt.toISOString()}
              vendor={vendor}
              locations={locations}
              backHref={VENDORS_PATH}
            />
            <section className="grid gap-3">
              <SectionHeader
                title="Vehicles"
                action={
                  status === "active" || status === "suspended" ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={newVendorVehicleHref(id)}>Add vehicle</Link>
                    </Button>
                  ) : null
                }
              />
              <VehiclesTable
                vehicles={vehicles}
                showLocation
                emptyMessage="No vehicle yet."
              />
            </section>
            <section className="grid gap-3">
              <SectionHeader
                title="Drivers"
                action={
                  status === "active" || status === "suspended" ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={newVendorDriverHref(id)}>Add driver</Link>
                    </Button>
                  ) : null
                }
              />
              <DriversTable
                drivers={drivers}
                showLocation
                emptyMessage="No driver yet."
              />
            </section>
          </>
        }
        side={
          <>
            {reviews ? (
              <Card className="grid gap-3">
                <CardTitle>Review</CardTitle>
                {vendor.reviewNote ? (
                  <p className="text-sm text-slate-600">
                    Reason on record: {vendor.reviewNote}
                  </p>
                ) : null}
                <VendorReview
                  vendorId={id}
                  name={vendor.name}
                  status={status}
                  isOurs={vendor.isOurs}
                  suspendNote={
                    held.length > 0 ? (
                      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {heldBookingsSentence(
                          vendor.name,
                          held,
                          "Suspending takes its vehicles and drivers off them.",
                        )}
                      </p>
                    ) : null
                  }
                />
              </Card>
            ) : null}
            <Card className="grid gap-3">
              <CardTitle>History</CardTitle>
              <HistoryTimeline
                entries={history}
                emptyMessage="Nothing recorded yet."
              />
            </Card>
          </>
        }
      />
    </>
  );
}
