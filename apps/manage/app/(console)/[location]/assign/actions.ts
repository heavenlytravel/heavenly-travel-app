"use server";

import {
  isDeclineReason,
  isTripEventKind,
  nextTripStep,
  parseRinggit,
  pickupInstant,
  textOf,
  TRIP_EVENT_LABELS,
  type PartRole,
} from "@repo/db";
import {
  answerParts,
  assignBooking,
  listTripEvents,
  nameParts,
  releaseAction,
  reportTripEvent,
  setPartCost,
  type PartAsk,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../../_lib/access";
import { revalidateLocation } from "../../../_lib/revalidate";
import {
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";

/**
 * Assign's writes: asking vendors for a vehicle and a driver, recording
 * their answers, naming what a vendor chose, releasing a part, reporting
 * for a driver on the day, and what we owe for a cancelled trip.
 * Operation's (`bookings.fulfil`),
 * checked again in each. The writers in @repo/db check the rest. No
 * email goes out from here, not even the customer's driver email: the
 * console's own emails wait for their settings. See
 * docs/261028-fulfilment-vendors-and-connect.md.
 */

/** What a fulfilment write answers: done or why not, and the bookings whose trips became assigned. */
type FulfilResult =
  | { ok: true; assigned?: string[] }
  | { ok: false; error: string; field?: string };

function finish(result: FulfilResult): ActionState {
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return null;
}

/** The ids posted under one name, one value each. */
const idsOf = (formData: FormData, name: string) =>
  formData.getAll(name).map(textOf).filter(Boolean);

/**
 * One role of a trip's Assign form, posted for each trip under
 * `<role>:<itemId>`: "" left for later, `vendor:<id>` asks that vendor to
 * choose, or the id of a vehicle or driver named, its vendor beside it
 * under `<role>Vendor:<itemId>`. The cost of each trip is under
 * `<role>Cost:<itemId>`, in ringgit, and a coach driver's tip under
 * `<role>Tip:<itemId>`, and why a vehicle is not of the class booked
 * under `vehicleClassReason`. Trips with the same choice make one
 * ask, so the same vehicle for every trip is one ask of them all.
 */
function asksOf(
  formData: FormData,
  role: PartRole,
  itemIds: readonly string[],
): PartAsk[] | { error: string; field: string } {
  const asks = new Map<string, PartAsk>();
  for (const itemId of itemIds) {
    const choice = textOf(formData.get(`${role}:${itemId}`));
    if (!choice) continue;
    const vendorId = choice.startsWith("vendor:")
      ? choice.slice("vendor:".length)
      : textOf(formData.get(`${role}Vendor:${itemId}`));
    if (!vendorId) {
      return { error: `Choose the ${role} again.`, field: `${role}:${itemId}` };
    }
    const recordId = choice.startsWith("vendor:") ? null : choice;
    const key = `${vendorId}:${recordId ?? ""}`;
    const ask = asks.get(key) ?? {
      vendorId,
      recordId,
      itemIds: [],
      costSen: {},
      tipSen: {},
      classReason:
        role === "vehicle"
          ? textOf(formData.get("vehicleClassReason")) || null
          : null,
    };
    ask.itemIds.push(itemId);
    const text = textOf(formData.get(`${role}Cost:${itemId}`));
    if (text !== "") {
      const sen = parseRinggit(text);
      if (sen === null) {
        return {
          error: "Enter the amount in RM, such as 120 or 120.50.",
          field: `${role}Cost:${itemId}`,
        };
      }
      ask.costSen[itemId] = sen;
    }
    const tip = textOf(formData.get(`${role}Tip:${itemId}`));
    if (tip !== "") {
      const sen = parseRinggit(tip);
      if (sen === null) {
        return {
          error: "Enter the tip in RM, such as 50.",
          field: `${role}Tip:${itemId}`,
        };
      }
      ask.tipSen[itemId] = sen;
    }
    asks.set(key, ask);
  }
  return [...asks.values()];
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
  const vehicle = asksOf(formData, "vehicle", itemIds);
  if ("error" in vehicle) return vehicle;
  const driver = asksOf(formData, "driver", itemIds);
  if ("error" in driver) return driver;
  const guide = asksOf(formData, "guide", itemIds);
  if ("error" in guide) return guide;
  // Each vendor asked answers by its own time, under `respondBy:<vendorId>`.
  const respondBy: Record<string, Date> = {};
  for (const [name, value] of formData) {
    if (!name.startsWith("respondBy:") || typeof value !== "string") continue;
    const [date, time] = value.split("T");
    const at = date && time ? pickupInstant(date, time.slice(0, 5)) : null;
    if (!at) {
      return {
        error: "Enter when they answer by, as a date and time.",
        field: name,
      };
    }
    if (at.getTime() < Date.now()) {
      return {
        error: "Answer by is past. Give them time to answer.",
        field: name,
      };
    }
    respondBy[name.slice("respondBy:".length)] = at;
  }
  return finish(
    await assignBooking(actorOf(admin), {
      bookingId,
      vehicle,
      driver,
      guide,
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

/** The vehicle, the driver or the guide a vendor chose, entered for it. */
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
  return finish(
    await nameParts(
      actorOf(admin),
      partIds,
      recordId,
      textOf(formData.get("vehicleClassReason")) || null,
    ),
  );
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
    return finish(await releaseAction(actor, { bookingId }, "released"));
  }
  for (const partId of partIds) {
    const result = await releaseAction(actor, { partId }, "released");
    if (!result.ok) return refusalOf(result);
  }
  return finish({ ok: true });
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
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/**
 * Operation taps for a driver who cannot, at the time it is entered, in
 * Connect's order: the next step only, or a no-show, or a problem.
 * Dropped off and no-show complete the trip.
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
  const next = nextTripStep(await listTripEvents([itemId]));
  if (next === null) return { error: "This trip has ended." };
  if (kind !== next && kind !== "no-show" && kind !== "problem") {
    return {
      error: `The next step is ${TRIP_EVENT_LABELS[next]}. Reload to see the latest report.`,
    };
  }
  const note = textOf(formData.get("note"));
  return finish(
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
