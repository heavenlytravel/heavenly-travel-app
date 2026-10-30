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
import { PlusIcon } from "@repo/ui/icons";
import { Notice } from "@repo/ui/notice";
import { Card, CardTitle } from "@repo/console/Card";
import { heldBookingsSentence } from "@repo/console/held-bookings";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { VendorStatusBadge } from "@repo/console/StatusBadges";
import { DriversTable } from "../../../../../_components/DriversTable";
import { HistoryTimeline } from "../../../../../_components/HistoryTimeline";
import { VehiclesTable } from "../../../../../_components/VehiclesTable";
import { getPermissions, requireAdmin } from "../../../../../_lib/access";
import {
  ALL,
  newVendorDriverHref,
  newVendorVehicleHref,
  vendorsHref,
} from "../../../../../_lib/routes";
import {
  locationsVisible,
  scopeOf,
  type ConsoleScope,
} from "../../../../../_lib/scope";
import { VendorForm } from "../_components/VendorForm";
import { VendorReview } from "../_components/VendorReview";

/**
 * Route: /[location]/fleet/vendors/[id], and …/vendors/new. A vendor's
 * details, its vehicles and drivers, which Operation keeps for one not on
 * Connect, and its history; for SUPER, its review and the "Ours" switch.
 * Under a location, a vendor that does not serve it is not found, and its
 * vehicles and drivers are those based there. See
 * docs/261028-fulfilment-vendors-and-connect.md.
 */
export default async function VendorPage({
  params,
}: PageProps<"/[location]/fleet/vendors/[id]">) {
  await requireAdmin("fleet.manage");
  const [scope, { id }] = await Promise.all([scopeOf(params), params]);
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<FormSkeleton sections={3} fields={4} />}
            side={<CardSkeleton rows={3} />}
          />
        </>
      }
    >
      {() => (id === "new" ? newVendor(scope) : vendorScreen(scope, id))}
    </Streamed>
  );
}

async function newVendor(scope: ConsoleScope) {
  const locations = await locationsVisible();
  return (
    <>
      <PageHeader title="Add Vendor" />
      <VendorForm
        locations={locations}
        scope={scope.slug ?? ALL}
        cancelHref={vendorsHref(scope.slug)}
      />
    </>
  );
}

async function vendorScreen(scope: ConsoleScope, id: string) {
  const [vendor, locations, permissions] = await Promise.all([
    getVendor(id),
    locationsVisible(),
    getPermissions(),
  ]);
  if (!vendor) notFound();
  const here = scope.location;
  if (here && !vendor.locations.some((l) => l.id === here.id)) notFound();
  const [vehicles, drivers, history] = await Promise.all([
    listVehicles({ vendorId: id, locationId: here?.id }),
    listDrivers({ vendorId: id, locationId: here?.id }),
    listActivityFor("vendor", id),
  ]);
  const status = isVendorStatus(vendor.status) ? vendor.status : "pending";
  const reviews = permissions.includes("vendors.review");
  const takesFleet = status === "active" || status === "suspended";
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
        meta={
          vendor.isOurs
            ? "Ours: no cost, Operation accepts its jobs"
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
              scope={scope.slug ?? ALL}
              cancelHref={vendorsHref(scope.slug)}
            />
            <Card flush>
              <CardTitle
                inset
                meta={vehicles.length > 0 ? vehicles.length : undefined}
                action={
                  takesFleet ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={newVendorVehicleHref(scope.slug, id)}>
                        <PlusIcon />
                        Add vehicle
                      </Link>
                    </Button>
                  ) : null
                }
              >
                Vehicles
              </CardTitle>
              <VehiclesTable
                vehicles={vehicles}
                scope={scope.slug}
                bare
                emptyMessage="No vehicle yet."
              />
            </Card>
            <Card flush>
              <CardTitle
                inset
                meta={drivers.length > 0 ? drivers.length : undefined}
                action={
                  takesFleet ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={newVendorDriverHref(scope.slug, id)}>
                        <PlusIcon />
                        Add driver
                      </Link>
                    </Button>
                  ) : null
                }
              >
                Drivers
              </CardTitle>
              <DriversTable
                drivers={drivers}
                scope={scope.slug}
                bare
                emptyMessage="No driver yet."
              />
            </Card>
          </>
        }
        side={
          <>
            {reviews ? (
              <Card>
                <CardTitle>Review</CardTitle>
                <div className="grid gap-3">
                  {vendor.reviewNote ? (
                    <p className="text-sm text-muted">
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
                        <Notice>
                          {heldBookingsSentence(
                            vendor.name,
                            held,
                            "Suspending takes its vehicles and drivers off them.",
                          )}
                        </Notice>
                      ) : null
                    }
                  />
                </div>
              </Card>
            ) : null}
            <Card>
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
