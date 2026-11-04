import "server-only";
import { suppliesIt } from "@repo/db";
import {
  getVendor,
  listDrivers,
  listGuides,
  listVehicles,
} from "@repo/db/server";

type Adds = { vehicles: boolean; drivers: boolean; guides: boolean };
const NOTHING: Adds = { vehicles: false, drivers: false, guides: false };

/**
 * What a vendor may add, by the services it ticked (`suppliesIt`): a
 * vehicle with car with driver or coach charter, a driver with those or
 * driver only, a guide with tour guide.
 */
export function addsOf(vendor: {
  isOurs: boolean;
  services: readonly string[];
}): Adds {
  return {
    vehicles:
      suppliesIt(vendor, { kind: "vehicle", category: "car-with-driver" }) ||
      suppliesIt(vendor, { kind: "vehicle", category: "coach-charter" }),
    drivers: suppliesIt(vendor, { kind: "driver" }),
    guides: suppliesIt(vendor, { kind: "guide" }),
  };
}

/**
 * A vendor's fleet as its three lists read it: its vehicles, its drivers,
 * and its tour guides when it offers tour guides or has some; `guides` is
 * null for any other vendor, whose Fleet shows no Guides tab. `adds` is
 * what it may add (`addsOf`). See docs/261103-tour-guide.md.
 */
export async function vendorFleet(vendorId: string) {
  const [vendor, vehicles, drivers, guides] = await Promise.all([
    getVendor(vendorId),
    listVehicles({ vendorId }),
    listDrivers({ vendorId }),
    listGuides({ vendorId }),
  ]);
  const adds = vendor ? addsOf(vendor) : NOTHING;
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
