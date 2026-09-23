import { db } from "./client";
import type { VehicleClass } from "./generated/prisma/client";

export type { VehicleClass };

export function listActiveVehicleClasses(): Promise<VehicleClass[]> {
  return db.vehicleClass.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function fitsPassengers(
  vehicleClass: Pick<VehicleClass, "minPassengers" | "maxPassengers">,
  passengers: number,
) {
  return (
    Number.isInteger(passengers) &&
    passengers >= vehicleClass.minPassengers &&
    passengers <= vehicleClass.maxPassengers
  );
}
