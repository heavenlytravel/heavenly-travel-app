import "server-only";
import { cache } from "react";
import { db } from "./client";

/** The one `AppSetting` row. It is created by the first write. */
const APP_SETTING_ID = "app";

/**
 * Whether the wall between teams is on, read once per request. Off until a
 * SUPER admin turns it on. See `may` in ./permissions.
 */
export const isWallActive = cache(async () => {
  const setting = await db.appSetting.findUnique({
    where: { id: APP_SETTING_ID },
  });
  return setting?.wallActive ?? false;
});

export async function setWallActive(wallActive: boolean) {
  await db.appSetting.upsert({
    where: { id: APP_SETTING_ID },
    update: { wallActive },
    create: { id: APP_SETTING_ID, wallActive },
  });
}
