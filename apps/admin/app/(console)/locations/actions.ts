"use server";

import {
  createLocation,
  parseAddressEntries,
  parseLocationFields,
  setLocationAddresses,
  textOf,
  updateLocation,
  type AddressWrite,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, getAdmin } from "../../_lib/access";
import { FORBIDDEN, stateOf, type ActionState } from "../../_lib/action-state";
import { LOCATIONS_PATH, locationHref } from "../../_lib/routes";

/**
 * The Locations screens' actions. Each checks `locations.manage` again,
 * passes the admin as the actor and lets the writer in @repo/db check the
 * rest.
 */
function revalidateLocation(id: string) {
  revalidatePath(locationHref(id));
  revalidatePath(LOCATIONS_PATH);
}

/** The location form's values; the ticked districts arrive as one field each. */
function locationValues(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    districts: formData.getAll("districts"),
  };
}

export async function createLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  const parsed = parseLocationFields(locationValues(formData));
  if (!parsed.ok) return { error: parsed.error };

  const result = await createLocation(actorOf(admin), parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateLocation(result.id);
  redirect(locationHref(result.id));
}

export async function updateLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return { error: "Missing location." };
  const parsed = parseLocationFields(locationValues(formData));
  if (!parsed.ok) return { error: parsed.error };

  const result = await updateLocation(actorOf(admin), id, parsed.value);
  if (result.ok) revalidateLocation(id);
  return stateOf(result);
}

/**
 * The saved addresses, as the form holds them: the whole list in its order.
 * A new address arrives as a Google place id and is resolved here.
 * `expected` is the ids the form was opened with, so a list someone else
 * changed meanwhile is not overwritten.
 */
export async function setLocationAddressesAction(
  locationId: string,
  expected: string[],
  rows: unknown,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (
    typeof locationId !== "string" ||
    !Array.isArray(expected) ||
    expected.some((id) => typeof id !== "string")
  ) {
    return { error: "Missing location." };
  }
  const parsed = parseAddressEntries(rows);
  if (!parsed.ok) return { error: parsed.error };

  const entries: AddressWrite[] = [];
  for (const entry of parsed.value) {
    if ("id" in entry) {
      entries.push(entry);
      continue;
    }
    const place = await resolvePlace(entry.placeId);
    if (!place) {
      return { error: `Google did not return the place of ${entry.name}.` };
    }
    entries.push({ place, name: entry.name });
  }

  const result = await setLocationAddresses(
    actorOf(admin),
    locationId,
    expected,
    entries,
  );
  if (result.ok) revalidateLocation(locationId);
  return stateOf(result);
}
