"use server";

import { parseDriverSelfFields, updateDriver } from "@repo/db/server";
import { type ActionState, refusalOf } from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import { actorOf, getDriverAccess, whyRefused } from "../../../_lib/access";

/**
 * The driver saves their own record: their name, phone, licences and
 * where they are paid. The rest stays with their vendor. The writer logs
 * what changed, the bank's number masked.
 */
export async function saveOwnDriverAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getDriverAccess();
  if (!access) {
    return whyRefused({ error: "Only a driver changes their own profile." });
  }
  const parsed = parseDriverSelfFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await updateDriver(
    actorOf(access.user),
    access.driver.id,
    parsed.value,
  );
  if (!result.ok) return refusalOf(result);
  revalidatePath("/~/account/driver");
  return { href: "/~/account/driver" };
}
