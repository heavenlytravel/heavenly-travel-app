import Link from "next/link";
import { modelName, plural } from "@repo/db";
import type { ListedVehicle } from "@repo/db/server";
import { LocationMark } from "../../_components/LocationMark";
import { locationVehiclesHref } from "../../_lib/routes";

/** One location's vehicles of the class. */
type LocationGroup = {
  location: ListedVehicle["location"];
  inService: number;
  outOfService: number;
  /** "2 Toyota Vios, 1 Honda City": those in service, by model. */
  models: string;
};

/** The vehicles by location, by the location's name, and in service by model. */
function byLocation(vehicles: readonly ListedVehicle[]): LocationGroup[] {
  const groups = new Map<
    string,
    {
      location: ListedVehicle["location"];
      outOfService: number;
      models: Map<string, number>;
    }
  >();
  for (const vehicle of vehicles) {
    let group = groups.get(vehicle.locationId);
    if (!group) {
      group = {
        location: vehicle.location,
        outOfService: 0,
        models: new Map(),
      };
      groups.set(vehicle.locationId, group);
    }
    if (!vehicle.isActive) {
      group.outOfService += 1;
      continue;
    }
    const name = modelName(vehicle.vehicleModel);
    group.models.set(name, (group.models.get(name) ?? 0) + 1);
  }
  return [...groups.values()]
    .map(({ location, outOfService, models }) => ({
      location,
      outOfService,
      inService: [...models.values()].reduce((sum, n) => sum + n, 0),
      models: [...models].map(([name, count]) => `${count} ${name}`).join(", "),
    }))
    .sort((a, b) => a.location.name.localeCompare(b.location.name));
}

/**
 * A class's vehicles on its page, a row per location they are based at:
 * how many are in service there, by model, and how many are out. Each row
 * opens the location's Vehicles tab, where they are added and pictured.
 */
export function ClassVehicles({
  vehicles,
}: {
  vehicles: readonly ListedVehicle[];
}) {
  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No vehicle of this class yet. They are added on each location&apos;s
        Vehicles tab, or under Vehicles.
      </p>
    );
  }
  return (
    <ul className="-mx-2 grid">
      {byLocation(vehicles).map((group) => (
        <li key={group.location.id}>
          <Link
            href={locationVehiclesHref(group.location.slug)}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 rounded-md px-2 py-2 transition-colors hover:bg-slate-50"
          >
            <LocationMark
              name={group.location.name}
              state={group.location.state}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900">
                {group.location.name}
              </span>
              <span className="block text-xs text-slate-500">
                {group.models || "None in service"}
                {group.outOfService > 0
                  ? ` · ${group.outOfService} out of service`
                  : ""}
              </span>
            </span>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {plural(group.inService, "vehicle")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
