"use server";

import {
  createLocation,
  createLocationEntry,
  deleteConfirmationOf,
  deleteLocation,
  deleteLocationEntry,
  isLocationPageKey,
  isLocationState,
  isPlaceSection,
  moveLocationEntry,
  moveLocationState,
  parseAddressEntries,
  parseLocationFields,
  parseSafetyBuffer,
  renameLocationEntry,
  savedAddressRefusal,
  addLocationAddress,
  setLocationAddresses,
  setSafetyBuffer,
  textOf,
  updateLocation,
  type AddressWrite,
} from "@repo/db/server";
import { resolvePlace } from "@repo/places/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  STALE_MESSAGE,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import {
  LOCATIONS_PATH,
  PAGES_PATH,
  locationHref,
  locationPageHref,
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
 * refreshes the customer site. A page's own writes are the page editor's,
 * in _components/page-editor/actions; the top choices are the home page
 * editor's, in ../pages/website/actions.
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
    return { href: locationTabHref(parsed.value.slug, "settings") };
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

/** A saved address added at once: its id, or why not and the field it is about. */
export type AddressAdded = { id: string } | { error: string; field?: string };

/**
 * Adds one saved address at once, from the Saved addresses list, a page's
 * editor or its Add dialog, and answers its id so a page can point at it.
 * From the list, `page` makes it a popular place, an attraction or a hotel
 * with a draft page of its own. The lists show it after the refresh.
 */
export async function addLocationAddressAction(
  locationId: string,
  placeId: string,
  name: string,
  page: { page: string; slug: string } | null = null,
): Promise<AddressAdded> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return { error: FORBIDDEN_MESSAGE };
  if (
    typeof locationId !== "string" ||
    typeof placeId !== "string" ||
    typeof name !== "string" ||
    (page !== null &&
      (typeof page !== "object" ||
        !isPlaceSection(page.page) ||
        typeof page.slug !== "string"))
  ) {
    return { error: STALE_MESSAGE };
  }
  const trimmed = name.replace(/\s+/g, " ").trim();
  const place = await resolvePlace(placeId);
  if (!place)
    return { error: `Google did not return the place of ${trimmed}.` };
  const result = await addLocationAddress(
    actorOf(admin),
    locationId,
    { place, name: trimmed },
    page && isPlaceSection(page.page)
      ? { page: page.page, slug: page.slug }
      : undefined,
  );
  if (!result.ok) return { error: result.error, field: result.field };
  revalidateEverywhere(locationId);
  return { id: result.id };
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
 * Deletes a location and opens the list. `seen` and `typed` are what the
 * dialog showed and what the admin typed: the slug, for a location that
 * has been live or that other locations price routes to (@repo/db's
 * delete-impact). The customer site drops the pages and the home page
 * card it may have shown, and refreshes those other locations' pages.
 */
export async function deleteLocationAction(
  locationId: string,
  seen: string[],
  typed: string | null,
): Promise<ActionState> {
  const admin = await getAdmin("locations.activate");
  if (!admin) return FORBIDDEN;
  const confirmation = deleteConfirmationOf(seen, typed);
  if (typeof locationId !== "string" || !confirmation) return STALE;

  const result = await deleteLocation(actorOf(admin), locationId, confirmation);
  if (!result.ok) return stateOf(result);
  revalidateLocations();
  // A deleted location leaves the home page's top choices and the list of pages.
  revalidatePath(PAGES_PATH, "layout");
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

/**
 * The safety buffer, on the location's settings: Operation's, as its
 * coverage is (`coverage.manage`). Nothing the public sees.
 */
export async function setSafetyBufferAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const locationId = textOf(formData.get("locationId"));
  if (!locationId) return STALE;
  const minutes = parseSafetyBuffer(Object.fromEntries(formData));
  if (!minutes.ok) return refusalOf(minutes);
  const result = await setSafetyBuffer(
    actorOf(admin),
    locationId,
    minutes.value,
  );
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/**
 * Adds a page to a section that takes pages on demand, from the Pages
 * tab's Add dialog, and opens its editor. The slug is the one the dialog
 * filled from the name, as Marketing left it.
 */
export async function createLocationEntryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  const locationId = textOf(formData.get("locationId"));
  const page = formData.get("page");
  const slug = textOf(formData.get("locationSlug"));
  if (!locationId || !slug || !isLocationPageKey(page)) return STALE;
  const entry = textOf(formData.get("slug"));

  const result = await createLocationEntry(actorOf(admin), locationId, page, {
    title: textOf(formData.get("title")),
    slug: entry,
    addressId: textOf(formData.get("addressId")) || null,
  });
  if (!result.ok) return stateOf(result);
  revalidateLocation();
  return { href: locationPageHref(slug, { page, slug: entry }) };
}

/**
 * Gives a page added on demand a new slug, and a place a new type, before
 * its first publish; the editor moves to its new address.
 */
export async function renameLocationEntryAction(
  locationId: string,
  locationSlug: string,
  page: string,
  from: string,
  toPage: string,
  to: string,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (
    typeof locationId !== "string" ||
    typeof locationSlug !== "string" ||
    !isLocationPageKey(page) ||
    typeof from !== "string" ||
    !isLocationPageKey(toPage) ||
    typeof to !== "string"
  ) {
    return STALE;
  }
  const result = await renameLocationEntry(
    actorOf(admin),
    locationId,
    { page, slug: from },
    { page: toPage, slug: to },
  );
  if (!result.ok) return stateOf(result);
  revalidateLocation();
  return { href: locationPageHref(locationSlug, { page: toPage, slug: to }) };
}

/** Deletes a page added on demand and opens the Pages tab. A public one leaves the customer site too. */
export async function deleteLocationEntryAction(
  locationId: string,
  locationSlug: string,
  page: string,
  slug: string,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (
    typeof locationId !== "string" ||
    typeof locationSlug !== "string" ||
    !isLocationPageKey(page) ||
    typeof slug !== "string"
  ) {
    return STALE;
  }
  const result = await deleteLocationEntry(
    actorOf(admin),
    locationId,
    page,
    slug,
  );
  if (!result.ok) return stateOf(result);
  revalidateEverywhere(locationId);
  return { href: locationTabHref(locationSlug, "pages") };
}

/** Moves a page added on demand one place up or down in its section, which the customer site shows at once. */
export async function moveLocationEntryAction(
  locationId: string,
  page: string,
  slug: string,
  by: number,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (
    typeof locationId !== "string" ||
    !isLocationPageKey(page) ||
    typeof slug !== "string" ||
    (by !== -1 && by !== 1)
  ) {
    return STALE;
  }
  const result = await moveLocationEntry(
    actorOf(admin),
    locationId,
    page,
    slug,
    by,
  );
  if (result.ok) revalidateEverywhere(locationId);
  return stateOf(result);
}
