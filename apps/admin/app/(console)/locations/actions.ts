"use server";

import {
  createLocation,
  deleteLocation,
  isLocationPageKey,
  isLocationState,
  moveLocationState,
  pageContentOf,
  parseAddressEntries,
  parseLocationFields,
  publishLocationPage,
  saveLocationPageDraft,
  savedAddressRefusal,
  setLocationAddresses,
  textOf,
  unpublishLocationPage,
  updateLocation,
  type AddressWrite,
  type PageSaved,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  refusalOf,
  STALE,
  stateOf,
} from "../../_lib/action-state";
import {
  HOME_PAGE_PATH,
  LOCATIONS_PATH,
  locationHref,
  locationTabHref,
} from "../../_lib/routes";
import {
  refreshDeletedLocationAfter,
  refreshLocationAfter,
} from "../../_lib/site";
import { revalidateLocation, revalidateLocations } from "./_lib/revalidate";

/**
 * The Locations screens' actions. Each checks `locations.manage` again, or
 * `locations.activate` for the state move and the delete, passes the admin
 * as the actor and lets the writer in @repo/db check the rest. Arguments
 * passed directly, not through a form, are checked for their type here: an
 * action is reachable by direct POST. A change the public can see also
 * refreshes the customer site. The top choices are the Home page screen's,
 * in ../home-page/actions.
 */

/** After a change the public can see: this console's screens and the customer site's pages. */
function revalidateEverywhere(id: string) {
  revalidateLocation();
  refreshLocationAfter(id);
}

/** The location form's values; the ticked states arrive as one field each. */
function locationValues(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    states: formData.getAll("states"),
  };
}

export async function createLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  const parsed = parseLocationFields(locationValues(formData));
  if (!parsed.ok) return refusalOf(parsed);

  const result = await createLocation(actorOf(admin), parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateLocation();
  return { href: locationHref(parsed.value.slug) };
}

export async function updateLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return STALE;
  const parsed = parseLocationFields(locationValues(formData));
  if (!parsed.ok) return refusalOf(parsed);

  const result = await updateLocation(actorOf(admin), id, parsed.value);
  if (!result.ok) return stateOf(result);
  revalidateEverywhere(id);
  // A draft's new slug is its new address in the console too.
  if (parsed.value.slug !== textOf(formData.get("previousSlug"))) {
    return { href: locationTabHref(parsed.value.slug, "details") };
  }
  return null;
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
  )
    return STALE;
  const parsed = parseAddressEntries(rows);
  if (!parsed.ok) return refusalOf(parsed);

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
  if (result.ok) revalidateEverywhere(locationId);
  return stateOf(result);
}

/** What the saved address dialog hears of a picked place. */
export type AddressPlaceCheck =
  { ok: true; detail: string } | { ok: false; error: string };

/**
 * Checks a place the moment it is picked in the saved address dialog,
 * before it joins the list: it has to lie in one of the location's states.
 * Answers the place's address for the line under its name, or the sentence
 * that says where it lies instead. Saving the list checks again.
 */
export async function checkAddressPlaceAction(
  locationId: string,
  placeId: string,
  label: string,
): Promise<AddressPlaceCheck> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };
  if (typeof locationId !== "string" || typeof placeId !== "string") {
    return { ok: false, error: "Missing location." };
  }
  const name = String(label).slice(0, 200);
  const place = await resolvePlace(placeId);
  if (!place) {
    return { ok: false, error: `Google did not return the place of ${name}.` };
  }
  const refusal = await savedAddressRefusal(locationId, name, place);
  if (refusal) return { ok: false, error: refusal };
  return {
    ok: true,
    detail:
      place.address && place.address !== name ? place.address : place.label,
  };
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
    revalidateLocation();
    // A draft changes nothing in public.
    if (publish) refreshLocationAfter(locationId);
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

/** Saves the content and makes it the page's public copy, when it is complete. */
export async function publishPageAction(
  locationId: string,
  page: string,
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writePage(locationId, page, version, content, true);
}

/** Takes the page from the public and keeps its text. */
export async function unpublishPageAction(
  locationId: string,
  page: string,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string" || !isLocationPageKey(page)) return STALE;

  const result = await unpublishLocationPage(actorOf(admin), locationId, page);
  if (result.ok) {
    revalidateEverywhere(locationId);
  }
  return stateOf(result);
}

/**
 * Deletes a location and opens the list. `typedSlug` is what the admin
 * typed to confirm, which a location that has been live or that other
 * locations price routes to asks for; null when nothing was asked.
 * `warnedOf` names, by id, the other locations the card said lose their
 * routes to its zones. The customer site drops the pages and the home page
 * card it may have shown, and refreshes those other locations' pages.
 */
export async function deleteLocationAction(
  locationId: string,
  typedSlug: string | null,
  warnedOf: string[],
): Promise<ActionState> {
  const admin = await getAdmin("locations.activate");
  if (!admin) return FORBIDDEN;
  if (
    typeof locationId !== "string" ||
    !Array.isArray(warnedOf) ||
    !warnedOf.every((id) => typeof id === "string")
  ) {
    return STALE;
  }
  if (typedSlug !== null && typeof typedSlug !== "string") {
    return { error: "Type the slug to confirm." };
  }

  const result = await deleteLocation(
    actorOf(admin),
    locationId,
    typedSlug,
    warnedOf,
  );
  if (!result.ok) return stateOf(result);
  revalidateLocations();
  revalidatePath(HOME_PAGE_PATH);
  refreshDeletedLocationAfter(result.slug, ...result.alsoChanged);
  return { href: LOCATIONS_PATH };
}

export async function moveLocationStateAction(
  locationId: string,
  to: string,
): Promise<ActionState> {
  const admin = await getAdmin("locations.activate");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string") return STALE;
  if (!isLocationState(to)) return STALE;

  const result = await moveLocationState(actorOf(admin), locationId, to);
  if (result.ok) revalidateEverywhere(locationId);
  return stateOf(result);
}
