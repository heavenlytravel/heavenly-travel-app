import "server-only";
import { vendorAddsOf, vendorShowsOf, type VendorAdds } from "@repo/db";
import {
  getVendor,
  listDrivers,
  listGuides,
  listVehicles,
} from "@repo/db/server";

const NOTHING: VendorAdds = { vehicles: false, drivers: false, guides: false };

/**
 * A vendor's fleet as its three lists read it: its vehicles, its drivers
 * and its tour guides, each when it supplies them (`vendorAddsOf`) or has
 * some from before; null otherwise, and Fleet shows no tab for it. What it
 * has but no longer supplies it sees, and cannot add to. `adds` is what
 * it may add. See docs/261103-tour-guide.md and
 * docs/261111-catalogue-booking-flow-and-ops.md, part E.
 */
export async function vendorFleet(vendorId: string) {
  const [vendor, vehicles, drivers, guides] = await Promise.all([
    getVendor(vendorId),
    listVehicles({ vendorId }),
    listDrivers({ vendorId }),
    listGuides({ vendorId }),
  ]);
  const adds = vendor ? vendorAddsOf(vendor) : NOTHING;
  const shows = vendorShowsOf(adds, {
    vehicles: vehicles.length,
    drivers: drivers.length,
    guides: guides.length,
  });
  const fleet = {
    vehicles: shows.vehicles ? vehicles : null,
    drivers: shows.drivers ? drivers : null,
    guides: shows.guides ? guides : null,
    adds,
  };
  // A vendor of none of them (attractions, say) still sees Vehicles, empty,
  // saying what to ask for.
  if (!fleet.vehicles && !fleet.drivers && !fleet.guides) {
    fleet.vehicles = vehicles;
  }
  return fleet;
}

type Fleet = Awaited<ReturnType<typeof vendorFleet>>;

/** Where Fleet opens: its first list shown, vehicles first (one always is). */
export function fleetHome(fleet: Fleet) {
  return fleet.vehicles
    ? "/~/vehicles"
    : fleet.drivers
      ? "/~/drivers"
      : "/~/guides";
}

/** The counts the Fleet tabs show. */
export function fleetCounts(fleet: Fleet) {
  return {
    vehicles: fleet.vehicles?.length ?? null,
    drivers: fleet.drivers?.length ?? null,
    guides: fleet.guides?.length ?? null,
  };
}
