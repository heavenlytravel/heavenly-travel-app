import { guardFor } from "./const-enum";

export const ADMIN_LEVELS = ["SUPER", "REGULAR", "OPS"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];
export const isAdminLevel = guardFor(ADMIN_LEVELS);

/** Areas of the product a signed-in user may enter. See `getAccess`. */
export const AREAS = ["user", "driver", "partner", "admin"] as const;
export type Area = (typeof AREAS)[number];
