import "server-only";
import { vendorAddsOf, type VendorAdds } from "@repo/db";
import {
  getVendor,
  listDrivers,
  listGuides,
  listVehicles,
} from "@repo/db/server";

const NOTHING: VendorAdds = { vehicles: false, drivers: false, guides: false };

/**
 * A vendor's fleet as its three lists read it: its vehicles, its drivers,
 * and its tour guides when it offers tour guides or has some; `guides` is
 * null for any other vendor, whose Fleet shows no Guides tab. `adds` is
 * what it may add (`vendorAddsOf`). See docs/261103-tour-guide.md.
 */
export async function vendorFleet(vendorId: string) {
  const [vendor, vehicles, drivers, guides] = await Promise.all([
    getVendor(vendorId),
    listVehicles({ vendorId }),
    listDrivers({ vendorId }),
    listGuides({ vendorId }),
  ]);
  const adds = vendor ? vendorAddsOf(vendor) : NOTHING;
  const offersGuides = guides.length > 0 || adds.guides;
  return { vehicles, drivers, guides: offersGuides ? guides : null, adds };
}

/** The counts the Fleet tabs show. */
export function fleetCounts(fleet: Awaited<ReturnType<typeof vendorFleet>>) {
  return {
    vehicles: fleet.vehicles.length,
    drivers: fleet.drivers.length,
    guides: fleet.guides?.length ?? null,
  };
}
