import type { VehicleClass } from "@repo/db/server";

/** How the tables spell a class's rules: "Notice 4 h · Cancel up to 24 h · Minimum 3 h" */
export function rulesText(vehicleClass: VehicleClass) {
  return [
    `Notice ${vehicleClass.minLeadHours} h`,
    `Cancel up to ${vehicleClass.cancellationCutoffHours} h`,
    `Minimum ${vehicleClass.minHourlyHours} h`,
  ].join(" · ");
}

/** How the tables spell a class's seats: "3" or "1 to 6" */
export function seatsText(vehicleClass: VehicleClass) {
  return vehicleClass.minPassengers === vehicleClass.maxPassengers
    ? String(vehicleClass.maxPassengers)
    : `${vehicleClass.minPassengers} to ${vehicleClass.maxPassengers}`;
}
