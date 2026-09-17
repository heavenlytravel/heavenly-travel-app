export const ADMIN_LEVELS = ["SUPER", "REGULAR", "OPS"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];

export function isAdminLevel(value: unknown): value is AdminLevel {
  return (
    typeof value === "string" &&
    (ADMIN_LEVELS as readonly string[]).includes(value)
  );
}

/** Areas of the product a signed-in user may enter. See `getAccess`. */
export const AREAS = ["user", "driver", "partner", "admin"] as const;
export type Area = (typeof AREAS)[number];
