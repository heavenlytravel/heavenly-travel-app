import type { TripCategory } from "./booking-status";
import { db } from "./client";
import type { VehicleClass } from "./generated/prisma/client";

export type { VehicleClass };

export function listActiveVehicleClasses(
  category: TripCategory,
): Promise<VehicleClass[]> {
  return db.vehicleClass.findMany({
    where: { category, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
