"use server";

import {
  changeTopChoice,
  createLocation,
  isLocationPageKey,
  isLocationState,
  isTopChoiceChange,
  moveLocationState,
  pageContentOf,
  parseAddressEntries,
  parseLocationFields,
  publishLocationPage,
  saveLocationPageDraft,
  setLocationAddresses,
  setLocationPageOn,
  textOf,
  updateLocation,
  type AddressWrite,
  type PageSaved,
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
import {
  LOCATIONS_PATH,
  locationHref,
  locationPageHref,
} from "../../_lib/routes";

/**
 * The Locations screens' actions. Each checks `locations.manage` again,
 * passes the admin as the actor and lets the writer in @repo/db check the
 * rest. Arguments passed directly, not through a form, are checked for their
 * type here: an action is reachable by direct POST.
 */
function revalidateLocation(id: string) {
  revalidatePath(locationHref(id));
  revalidatePath(LOCATIONS_PATH);
}

const MISSING_LOCATION: ActionState = { error: "Missing location." };

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
  if (!id) return MISSING_LOCATION;
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
    return MISSING_LOCATION;
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

/**
 * The page editor's two writes. `version` names the content the editor was
 * opened with, so a page someone else changed meanwhile is not overwritten;
 * the answer carries the new one. The content arrives as the editor holds it
 * and is read into its one shape here.
 */
async function writePage(
  locationId: string,
  page: string,
  version: string | null,
  content: unknown,
  publish: boolean,
): Promise<PageSaved> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (
    typeof locationId !== "string" ||
    !isLocationPageKey(page) ||
    (version !== null && typeof version !== "string")
  ) {
    return { ok: false, error: "Missing page." };
  }
  const draft = pageContentOf(page, content);

  const result = publish
    ? await publishLocationPage(
        actorOf(admin),
        locationId,
        page,
        version,
        draft,
      )
    : await saveLocationPageDraft(locationId, page, version, draft);
  if (result.ok) {
    revalidateLocation(locationId);
    revalidatePath(locationPageHref(locationId, page));
  }
  return result;
}

/** Overwrites the page's draft. Nothing changes in public. */
export async function savePageDraftAction(
  locationId: string,
  page: string,
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writePage(locationId, page, version, content, false);
}

/** Saves the content and makes it the page's published copy, when it is complete. */
export async function publishPageAction(
  locationId: string,
  page: string,
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writePage(locationId, page, version, content, true);
}

export async function setPageOnAction(
  locationId: string,
  page: string,
  isOn: boolean,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string" || !isLocationPageKey(page)) {
    return { error: "Missing page." };
  }
  if (typeof isOn !== "boolean") return { error: "Choose on or off." };

  const result = await setLocationPageOn(
    actorOf(admin),
    locationId,
    page,
    isOn,
  );
  if (result.ok) revalidateLocation(locationId);
  return stateOf(result);
}

export async function moveLocationStateAction(
  locationId: string,
  to: string,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string") return MISSING_LOCATION;
  if (!isLocationState(to)) return { error: "Choose a state." };

  const result = await moveLocationState(actorOf(admin), locationId, to);
  if (result.ok) revalidateLocation(locationId);
  return stateOf(result);
}

/** Adds, removes or moves the location among the home page's top choices. */
export async function changeTopChoiceAction(
  locationId: string,
  change: string,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string") return MISSING_LOCATION;
  if (!isTopChoiceChange(change)) return { error: "Choose a change." };

  const result = await changeTopChoice(actorOf(admin), locationId, change);
  // The places of the other top choices move with it.
  if (result.ok) revalidatePath(LOCATIONS_PATH, "layout");
  return stateOf(result);
}
