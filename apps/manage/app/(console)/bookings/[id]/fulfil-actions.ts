"use server";

import {
  isDeclineReason,
  isTripEventKind,
  parseRinggit,
  pickupInstant,
  textOf,
  type PartRole,
} from "@repo/db";
import {
  answerParts,
  assignBooking,
  listCandidates,
  listVendorOptions,
  nameParts,
  releaseAction,
  reportTripEvent,
  setPartCost,
  type Candidate,
  type PartAsk,
  type VendorOption,
} from "@repo/db/server";
import { sendDriverEmailFor } from "@repo/email";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { actorOf, getAdmin } from "../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import {
  BOOKINGS_PATH,
  LOCATION_ROUTE,
  bookingHref,
} from "../../../_lib/routes";

/**
 * The booking's fulfilment: asking vendors for a vehicle and a driver,
 * recording their answers, naming what a vendor chose, releasing a part,
 * and what we owe for a cancelled trip. Operation's (`bookings.fulfil`),
 * checked again in each. The writers in @repo/db check the rest; a trip
 * that became assigned sends the customer their driver once the response
 * is out. See docs/261028-fulfilment-vendors-and-connect.md.
 */

/** What a fulfilment write answers: done or why not, and the bookings whose trips became assigned. */
type FulfilResult =
  | { ok: true; assigned?: string[] }
  | { ok: false; error: string; field?: string };

function finish(bookingId: string, result: FulfilResult): ActionState {
  if (!result.ok) return refusalOf(result);
  for (const id of result.assigned ?? []) {
    after(() => sendDriverEmailFor(id));
  }
  revalidatePath(bookingHref(bookingId));
  revalidatePath(BOOKINGS_PATH);
  revalidatePath(LOCATION_ROUTE, "layout");
  return null;
}

/** The ids posted under one name, one value each. */
const idsOf = (formData: FormData, name: string) =>
  formData.getAll(name).map(textOf).filter(Boolean);

/** What the assign panel picks from, read when it opens. */
export type AssignChoices = {
  vehicles: Candidate[];
  drivers: Candidate[];
  vendors: VendorOption[];
};

export async function loadAssignChoices(
  bookingId: string,
): Promise<AssignChoices | null> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin || typeof bookingId !== "string" || !bookingId) return null;
  const [vehicles, drivers, vendors] = await Promise.all([
    listCandidates(bookingId, "vehicle"),
    listCandidates(bookingId, "driver"),
    listVendorOptions(),
  ]);
  return {
    vehicles,
    drivers,
    vendors: vendors.filter((v) => v.status === "active"),
  };
}

/**
 * One role of the panel: "" left out, `vendor:<id>` asks that vendor to
 * choose, or the id of a vehicle or driver named, its vendor posted beside
 * it. Its cost per trip is posted under `<role>Cost:<itemId>` in ringgit.
 */
function askOf(
  formData: FormData,
  role: PartRole,
  itemIds: readonly string[],
): PartAsk | null | { error: string; field: string } {
  const choice = textOf(formData.get(role));
  if (!choice) return null;
  const vendorId = choice.startsWith("vendor:")
    ? choice.slice("vendor:".length)
    : textOf(formData.get(`${role}Vendor`));
  if (!vendorId) {
    return { error: `Choose the ${role} again.`, field: role };
  }
  const costSen: Record<string, number> = {};
  for (const itemId of itemIds) {
    const text = textOf(formData.get(`${role}Cost:${itemId}`));
    if (text === "") continue;
    const sen = parseRinggit(text);
    if (sen === null) {
      return {
        error: "Enter each amount in RM, such as 120 or 120.50.",
        field: `${role}Cost`,
      };
    }
    costSen[itemId] = sen;
  }
  return {
    vendorId,
    recordId: choice.startsWith("vendor:") ? null : choice,
    costSen,
  };
}

export async function assignAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const itemIds = idsOf(formData, "itemId");
  if (!bookingId) return STALE;
  const vehicle = askOf(formData, "vehicle", itemIds);
  if (vehicle && "error" in vehicle) return vehicle;
  const driver = askOf(formData, "driver", itemIds);
  if (driver && "error" in driver) return driver;
  const [date, time] = textOf(formData.get("respondBy")).split("T");
  const respondBy = date && time ? pickupInstant(date, time.slice(0, 5)) : null;
  if (textOf(formData.get("respondBy")) && !respondBy) {
    return {
      error: "Enter when they answer by, as a date and time.",
      field: "respondBy",
    };
  }
  if (respondBy && respondBy.getTime() < Date.now()) {
    return {
      error: "Answer by is past. Give them time to answer.",
      field: "respondBy",
    };
  }
  return finish(
    bookingId,
    await assignBooking(actorOf(admin), {
      bookingId,
      itemIds,
      vehicle,
      driver,
      respondBy,
      acceptOurs: formData.get("acceptOurs") === "on",
    }),
  );
}

/**
 * An answer to parts: accept or decline, for the vendor or the driver.
 * Accepting for ours is Operation's own yes; for any other vendor, or any
 * driver, it is recorded on their behalf, given by phone.
 */
export async function answerPartsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const partIds = idsOf(formData, "partId");
  const as = textOf(formData.get("as"));
  if (
    !bookingId ||
    partIds.length === 0 ||
    (as !== "vendor" && as !== "driver")
  ) {
    return STALE;
  }
  const accept = formData.get("accept") === "true";
  const reason = textOf(formData.get("reason"));
  return finish(
    bookingId,
    await answerParts(actorOf(admin), {
      partIds,
      as,
      accept,
      reason: isDeclineReason(reason) ? reason : undefined,
      note: textOf(formData.get("note")),
      recorded: formData.get("recorded") === "true",
    }),
  );
}

/** The vehicle or the driver a vendor chose, entered for it. */
export async function namePartsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const partIds = idsOf(formData, "partId");
  const recordId = textOf(formData.get("recordId"));
  if (!bookingId || partIds.length === 0) return STALE;
  if (!recordId) return { error: "Choose which one.", field: "recordId" };
  return finish(bookingId, await nameParts(actorOf(admin), partIds, recordId));
}

/** Lets one part go, or every part of the booking with `all`. */
export async function releaseFulfilAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const partIds = idsOf(formData, "partId");
  if (!bookingId) return STALE;
  const actor = actorOf(admin);
  if (partIds.length === 0) {
    return finish(
      bookingId,
      await releaseAction(actor, { bookingId }, "released"),
    );
  }
  for (const partId of partIds) {
    const result = await releaseAction(actor, { partId }, "released");
    if (!result.ok) return refusalOf(result);
  }
  return finish(bookingId, { ok: true });
}

/** What we owe a vendor for a part of a cancelled trip, with why. */
export async function setPartCostAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const partId = textOf(formData.get("partId"));
  if (!bookingId || !partId) return STALE;
  const sen = parseRinggit(textOf(formData.get("costSen")));
  if (sen === null) {
    return { error: "Enter the amount in RM, such as 120.", field: "costSen" };
  }
  const result = await setPartCost(
    actorOf(admin),
    partId,
    sen,
    textOf(formData.get("reason")),
  );
  if (result.ok) revalidatePath(bookingHref(bookingId));
  return stateOf(result);
}

/**
 * Operation taps for a driver who cannot: the same kinds as Connect's,
 * at the time it is entered. Dropped off and no-show complete the trip.
 */
export async function reportForDriverAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const itemId = textOf(formData.get("itemId"));
  const kind = textOf(formData.get("kind"));
  if (!bookingId || !itemId || !isTripEventKind(kind)) return STALE;
  const note = textOf(formData.get("note"));
  return finish(
    bookingId,
    await reportTripEvent(
      actorOf(admin),
      { admin: true },
      {
        itemId,
        kind,
        at: new Date(),
        note: note || null,
        clientId: crypto.randomUUID(),
      },
    ),
  );
}
