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
import {
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  stateOf,
  type ActionState,
} from "../../_lib/action-state";
import { checkPlace, type PlaceCheck } from "../../_lib/place-check";
import { LOCATIONS_PATH, locationHref } from "../../_lib/routes";

/**
 * The Locations screens' actions. Each checks `locations.manage` again,
 * asks Google for the places it was given by id, passes the admin as the
 * actor and lets the writer in @repo/db check the rest.
 */

/** Every state's page of the Coverage screen, as a route pattern: a location shows on its district's row. */
const STATE_PAGES = "/(console)/coverage/[code]";

function revalidateLocation(id: string) {
  revalidatePath(locationHref(id));
  revalidatePath(LOCATIONS_PATH);
  revalidatePath(STATE_PAGES, "page");
}

const NO_PLACE =
  "Google did not return that place. Pick it from the list again.";

/** The district a picked place falls in, shown before the location is saved. */
export async function checkLocationPlaceAction(
  placeId: string,
): Promise<PlaceCheck> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  return checkPlace(placeId);
}

export async function createLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  const placeId = textOf(formData.get("placeId"));
  if (!placeId) return { error: "Pick the place from the list." };
  const parsed = parseLocationFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const place = await resolvePlace(placeId);
  if (!place) return { error: NO_PLACE };

  const result = await createLocation(actorOf(admin), parsed.value, place);
  if (!result.ok) return stateOf(result);
  revalidateLocation(result.id);
  redirect(locationHref(result.id));
}

/** The details form. `placeId` is sent only when another place was picked. */
export async function updateLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return { error: "Missing location." };
  const parsed = parseLocationFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const placeId = textOf(formData.get("placeId"));
  const place = placeId ? await resolvePlace(placeId) : undefined;
  if (place === null) return { error: NO_PLACE };

  const result = await updateLocation(actorOf(admin), id, parsed.value, place);
  if (result.ok) revalidateLocation(id);
  return stateOf(result);
}

/**
 * The saved addresses, as the form holds them: the whole list in its order.
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
