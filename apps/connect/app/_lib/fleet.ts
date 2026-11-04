import "server-only";
import {
  getVendor,
  listDrivers,
  listGuides,
  listVehicles,
} from "@repo/db/server";

/**
 * A vendor's fleet as its three lists read it: its vehicles, its drivers,
 * and its tour guides when it offers tour guides or has some; `guides` is
 * null for any other vendor, whose Fleet shows no Guides tab. See
 * docs/261103-tour-guide.md.
 */
export async function vendorFleet(vendorId: string) {
  const [vendor, vehicles, drivers, guides] = await Promise.all([
    getVendor(vendorId),
    listVehicles({ vendorId }),
    listDrivers({ vendorId }),
    listGuides({ vendorId }),
  ]);
  const offersGuides =
    guides.length > 0 || (vendor?.services.includes("tour-guide") ?? false);
  return { vehicles, drivers, guides: offersGuides ? guides : null };
}

/** The counts the Fleet tabs show. */
export function fleetCounts(fleet: Awaited<ReturnType<typeof vendorFleet>>) {
  return {
    vehicles: fleet.vehicles.length,
    drivers: fleet.drivers.length,
    guides: fleet.guides?.length ?? null,
  };
}
