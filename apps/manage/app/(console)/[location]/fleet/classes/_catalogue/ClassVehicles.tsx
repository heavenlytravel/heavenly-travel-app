import Link from "next/link";
import { modelName, plural } from "@repo/db";
import type { ListedVehicle } from "@repo/db/server";
import { CardRows } from "@repo/console/Card";
import { LocationMark } from "@repo/console/LocationMark";
import { vehiclesHref } from "../../../../../_lib/routes";

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
 * A class's vehicles on its page in the catalogue, a row per location
 * they are based at across a `flush` card: how many are in service
 * there, by model, and how many are out. Each row opens the location's
 * vehicles.
 */
export function ClassVehicles({
  vehicles,
}: {
  vehicles: readonly ListedVehicle[];
}) {
  if (vehicles.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-muted">
        No vehicle of this class yet.
      </p>
    );
  }
  return (
    <CardRows>
      {byLocation(vehicles).map((group) => (
        <li key={group.location.id}>
          <Link
            href={vehiclesHref(group.location.slug)}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 px-5 py-3 transition-colors hover:bg-hover"
          >
            <LocationMark
              name={group.location.name}
              state={group.location.state}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {group.location.name}
              </span>
              <span className="block text-xs text-muted">
                {group.models || "None in service"}
                {group.outOfService > 0
                  ? ` · ${group.outOfService} out of service`
                  : ""}
              </span>
            </span>
            <span className="text-sm font-semibold text-ink tabular-nums">
              {plural(group.inService, "vehicle")}
            </span>
          </Link>
        </li>
      ))}
    </CardRows>
  );
}
