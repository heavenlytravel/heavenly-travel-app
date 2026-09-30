import "server-only";
import { cache } from "react";
import { logActivity } from "./activity";
import { APP_SETTING_ID, type Actor } from "./activity-actions";
import { db } from "./client";

/**
 * The one `AppSetting` row, created by the first write. Whether the wall
 * between teams is on is read once per request. Off until a SUPER admin
 * turns it on. See `may` in ./permissions.
 */
export const isWallActive = cache(async () => {
  const setting = await db.appSetting.findUnique({
    where: { id: APP_SETTING_ID },
  });
  return setting?.wallActive ?? false;
});

/** Flips the wall and logs the flip. Setting it to what it is logs nothing. */
export async function setWallActive(actor: Actor, wallActive: boolean) {
  await db.$transaction(async (tx) => {
    const setting = await tx.appSetting.findUnique({
      where: { id: APP_SETTING_ID },
    });
    const was = setting?.wallActive ?? false;
    if (was === wallActive) return;

    await tx.appSetting.upsert({
      where: { id: APP_SETTING_ID },
      update: { wallActive },
      create: { id: APP_SETTING_ID, wallActive },
    });
    await logActivity(tx, actor, {
      action: "wall.switched",
      entityId: APP_SETTING_ID,
      before: { wallActive: was },
      after: { wallActive },
    });
  });
}
