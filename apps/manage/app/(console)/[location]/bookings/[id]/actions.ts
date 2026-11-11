"use server";

import {
  isChargeRevisionKind,
  isIsoDate,
  isPriceRevisionKind,
  MAX_STOP_WAIT_MINUTES,
  parseLegacyInvoiceNumber,
  parsePriceOverride,
  parseReason,
  parseRinggit,
  parseContact,
  PRICE_OVERRIDE_FIELDS,
  textOf,
  type AmendWarning,
  type PriceOverride,
} from "@repo/db";
import {
  addBookingNote,
  addCharge,
  addItem,
  addStop,
  ADVANCE_PERMISSIONS,
  advanceItem,
  amendItem,
  billingPreviewOf,
  cancelBookingAsAdmin,
  cancelItem,
  isNextItemStatus,
  priceItem,
  quoteItemStop,
  reinstateBooking,
  reinstateItem,
  setBookingBusiness,
  setLegacyInvoiceNumber,
  setPayLater,
  updateBookingContact,
  type BookingChange,
  type CancelFee,
} from "@repo/db/server";
import { resolvePlace, tripRouting } from "@repo/places/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { revalidateLocation } from "../../../../_lib/revalidate";
import { LEGACY_INVOICE_FIELD } from "../_lib/trip-form";
import { prepareFormItem, savedBookingHref } from "../_lib/trip-server";
import { WARN_PARAM } from "./warnings";

/**
 * Every change re-checks the session and the permission (actions are
 * reachable by direct POST), passes the admin as the actor for the log and
 * lets the booking core check the status, write the revision and bill
 * what it moved. No email goes out: the console's own emails wait for
 * their settings. A change moves the booking, the lists and the counts of
 * every scope, and the menu's count of what waits.
 */
async function finish(result: BookingChange): Promise<ActionState> {
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return null;
}

/** Confirm or complete one trip: one step forward, named explicitly. Confirming first bills the booking. */
export async function advanceItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  const to = formData.get("to");
  if (!itemId || !isNextItemStatus(to)) {
    return STALE;
  }
  const admin = await getAdmin(ADVANCE_PERMISSIONS[to]);
  if (!admin) return FORBIDDEN;
  return finish(await advanceItem(actorOf(admin), itemId, to));
}

/** A cancellation fee as posted: none when the amount is empty, else the amount and why. */
function feeOf(
  formData: FormData,
): { ok: true; fee: CancelFee } | { error: string; field: string } {
  const typed = textOf(formData.get("feeAmount"));
  if (typed === "") return { ok: true, fee: null };
  const amountSen = parseRinggit(typed);
  if (amountSen === null || amountSen === 0) {
    return {
      error: "Enter the fee in RM, or leave it empty for none.",
      field: "feeAmount",
    };
  }
  const reason = parseReason(formData.get("reason"), "a fee is kept");
  if (!reason.ok) return { error: reason.error, field: "reason" };
  return { ok: true, fee: { amountSen, reason: reason.value } };
}

/** Cancels one trip, with a fee or none. */
export async function cancelItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return STALE;
  const fee = feeOf(formData);
  if (!("ok" in fee)) return fee;
  return finish(await cancelItem(actorOf(admin), itemId, fee.fee));
}

/** Cancels the whole booking, with a fee or none. */
export async function cancelBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return STALE;
  const fee = feeOf(formData);
  if (!("ok" in fee)) return fee;
  return finish(await cancelBookingAsAdmin(actorOf(admin), bookingId, fee.fee));
}

/** Who the booking is for, as staff correct it: name, phone and email. Nothing is emailed. */
export async function updateContactAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const contact = parseContact({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!contact.ok) return refusalOf(contact);
  const result = await updateBookingContact(
    actorOf(admin),
    bookingId,
    contact.value,
  );
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** An internal note; every team may add one. Nothing is emailed. */
export async function addNoteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.notes");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const result = await addBookingNote(
    actorOf(admin),
    bookingId,
    String(formData.get("body") ?? ""),
  );
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/**
 * A new price for one trip with why, a discount or a correction, or the
 * quote back (`remove`). Reservation and Sales (`bookings.create`). No
 * email: the price was agreed outside the app.
 */
export async function priceItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.create");
  if (!admin) return FORBIDDEN;
  const itemId = textOf(formData.get("itemId"));
  const kind = textOf(formData.get("kind"));
  if (!itemId || !isPriceRevisionKind(kind)) return STALE;
  let override: PriceOverride | null = null;
  if (textOf(formData.get("remove")) !== "true") {
    const parsed = parsePriceOverride({
      amount: formData.get(PRICE_OVERRIDE_FIELDS.amount),
      reason: formData.get(PRICE_OVERRIDE_FIELDS.reason),
    });
    if (!parsed.ok) return refusalOf(parsed);
    if (!parsed.value) {
      return {
        error: "Enter the new price and the reason.",
        field: PRICE_OVERRIDE_FIELDS.amount,
      };
    }
    override = parsed.value;
  }
  return finish(await priceItem(actorOf(admin), itemId, { kind, override }));
}

/** The booking's page after an amend, saying what the change no longer fits that stays assigned. */
function withWarnings(href: string, warnings: readonly AmendWarning[]) {
  return warnings.length > 0
    ? `${href}${href.includes("?") ? "&" : "?"}${WARN_PARAM}=${warnings.join(",")}`
    : href;
}

/**
 * Replaces one trip's trip, vehicle and details with the amend form's,
 * priced again on the server, the agreed price by the price rule.
 * Reservation and Sales. The vendors and the driver stay; the booking's
 * page says what no longer fits them.
 */
export async function amendItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const itemId = textOf(formData.get("itemId"));
  if (!itemId) return STALE;

  const prepared = await prepareFormItem(formData);
  if (!prepared.ok) return refusalOf(prepared);
  // An agreed price is its own permission, checked only when one is posted.
  if (prepared.override && !(await getAdmin("bookings.create"))) {
    return FORBIDDEN;
  }
  const result = await amendItem(actorOf(admin), itemId, prepared);
  const refused = await finish(result);
  if (refused || !result.ok) return refused;
  return {
    href: withWarnings(
      savedBookingHref(formData, result.booking),
      result.warnings,
    ),
  };
}

/**
 * Adds a trip to a booking, priced on the server as New booking's trips
 * are. Reservation and Sales; an agreed price with it needs
 * `bookings.create`, as on the amend.
 */
export async function addTripAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;

  const prepared = await prepareFormItem(formData);
  if (!prepared.ok) return refusalOf(prepared);
  if (prepared.override && !(await getAdmin("bookings.create"))) {
    return FORBIDDEN;
  }
  const result = await addItem(actorOf(admin), bookingId, prepared);
  const refused = await finish(result);
  if (refused || !result.ok) return refused;
  return { href: savedBookingHref(formData, result.booking) };
}

/** What a stop's quote answers the dialog: what it adds, the suggestions, or why it cannot be priced. */
export type StopQuoteAnswer =
  | {
      ok: true;
      label: string;
      quoteAddSen: number;
      extraKm: number | null;
      /** What the trip charges now. */
      chargedSen: number;
      /** The trip's price with the stop, by the price rule. */
      suggestedSen: number;
      /** The driver's stop pay from the location's rates; null when not entered. */
      paySuggestionSen: number | null;
      /** Why the legs could not be priced, when they could not: staff type the price. */
      quoteError: string | null;
    }
  | { ok: false; error: string };

/** A stop's place resolved and quoted on its trip (`quoteItemStop`). */
async function quoteOf(itemId: string, placeId: string, at: number) {
  const place = await resolvePlace(placeId);
  if (!place) {
    return {
      ok: false as const,
      error: "Google did not return that place. Choose it again.",
    };
  }
  const quoted = await quoteItemStop(itemId, place, at, tripRouting);
  return quoted.ok ? { ...quoted, place } : quoted;
}

/** Asks what a stop at a place adds to a trip, for the Add stop dialog. Nothing is saved. */
export async function quoteStopAction(
  itemId: string,
  placeId: string,
  at: number,
): Promise<StopQuoteAnswer> {
  if (!(await stopAdmin())) return { ok: false, error: FORBIDDEN_MESSAGE };
  const quoted = await quoteOf(
    String(itemId),
    String(placeId),
    Number(at) || 0,
  );
  if (!quoted.ok) return quoted;
  const { quote } = quoted;
  return {
    ok: true,
    label: quoted.place.label,
    quoteAddSen: quote.ok ? quote.quoteAddSen : 0,
    extraKm: quote.ok ? quote.extraKm : null,
    chargedSen: quoted.chargedSen,
    suggestedSen: quoted.suggestedSen,
    paySuggestionSen: quoted.paySuggestionSen,
    quoteError: quote.ok ? null : quote.error,
  };
}

/** Who adds stops and charges: Reservation and Sales, and Operation during the trip. */
async function stopAdmin() {
  return (
    (await getAdmin("bookings.manage")) ?? (await getAdmin("bookings.fulfil"))
  );
}

/**
 * Adds a stop to a trip: the place quoted again on the server, the
 * trip's new price and the driver's stop pay as staff agreed them, with
 * why when they differ from the suggestions. Reservation, Sales and
 * Operation, who adds stops during the trip.
 */
export async function addStopAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await stopAdmin();
  if (!admin) return FORBIDDEN;
  const itemId = textOf(formData.get("itemId"));
  const placeId = textOf(formData.get("placeId"));
  if (!itemId) return STALE;
  if (!placeId)
    return { error: "Choose the stop from the list.", field: "place" };
  const at = Number(textOf(formData.get("at"))) || 0;
  const wait = Number(textOf(formData.get("waitMinutes")) || "0");
  if (!Number.isInteger(wait) || wait < 0 || wait > MAX_STOP_WAIT_MINUTES) {
    return {
      error: `Enter the wait in minutes, up to ${MAX_STOP_WAIT_MINUTES}.`,
      field: "waitMinutes",
    };
  }
  const charged = parseRinggit(textOf(formData.get("chargedAmount")));
  if (charged === null)
    return {
      error: "Enter the trip's price with the stop, in RM.",
      field: "chargedAmount",
    };
  const pay = parseRinggit(textOf(formData.get("driverPay")) || "0");
  if (pay === null)
    return {
      error: "Enter the driver's pay for the stop, in RM, or 0.",
      field: "driverPay",
    };
  const reason = textOf(formData.get("reason")) || null;

  const quoted = await quoteOf(itemId, placeId, at);
  if (!quoted.ok) return { error: quoted.error };
  const add = quoted.quote.ok ? quoted.quote.quoteAddSen : 0;
  if (
    (charged !== quoted.suggestedSen ||
      pay !== (quoted.paySuggestionSen ?? pay)) &&
    !reason
  ) {
    return {
      error: "Say why the price differs from the suggestion.",
      field: "reason",
    };
  }
  return finish(
    await addStop(actorOf(admin), itemId, {
      stop: {
        place: quoted.place,
        waitMinutes: wait,
        quoteAddSen: add,
        extraKm: quoted.quote.ok ? quoted.quote.extraKm : null,
      },
      at,
      chargedSen: charged,
      driverPaySen: pay,
      reason,
    }),
  );
}

/**
 * Adds a charge to a booking: an add-on or a late charge, for a trip or
 * the booking, with what it adds to the trip's driver's pay. Reservation,
 * Sales and Operation, who adds late charges during the trip.
 */
export async function addChargeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await stopAdmin();
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  const kind = textOf(formData.get("kind"));
  if (!bookingId || !isChargeRevisionKind(kind)) return STALE;
  const amount = parseRinggit(textOf(formData.get("amount")));
  if (amount === null || amount === 0)
    return { error: "Enter the amount in RM.", field: "amount" };
  const pay = parseRinggit(textOf(formData.get("driverPay")) || "0");
  if (pay === null)
    return { error: "Enter the driver's pay in RM, or 0.", field: "driverPay" };
  return finish(
    await addCharge(actorOf(admin), bookingId, {
      kind,
      itemId: textOf(formData.get("itemId")) || null,
      label: textOf(formData.get("label")),
      amountSen: amount,
      driverPaySen: pay,
      reason: textOf(formData.get("reason")) || null,
    }),
  );
}

/**
 * What saving the booking at a new total would bill, for a dialog to say
 * before the save: "Saving issues HTI-0013 for RM 90.00." Nothing is
 * given; another save may take the number first.
 */
export async function billingPreviewAction(
  bookingId: string,
  chargedSen: number,
): Promise<{ sentence: string } | { error: string }> {
  if (!(await getAdmin("bookings.view"))) return { error: FORBIDDEN_MESSAGE };
  if (!Number.isInteger(chargedSen) || chargedSen < 0) return { error: "" };
  const preview = await billingPreviewOf(String(bookingId), chargedSen);
  return preview
    ? { sentence: preview.sentence }
    : { error: "This booking was deleted meanwhile." };
}

/** Sets or clears the booking's old invoice number: a note, it bills nothing. */
export async function setLegacyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const legacy = parseLegacyInvoiceNumber(
    textOf(formData.get(LEGACY_INVOICE_FIELD)),
  );
  if (!legacy.ok) return { error: legacy.error, field: LEGACY_INVOICE_FIELD };
  const result = await setLegacyInvoiceNumber(
    actorOf(admin),
    bookingId,
    legacy.value,
  );
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return null;
}

/**
 * Pay later on the booking, with the day it is due by, or back to Pending
 * when `clear` is posted.
 */
export async function setPayLaterAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const clear = textOf(formData.get("clear")) === "true";
  const dueOn = textOf(formData.get("dueOn"));
  if (!clear && !isIsoDate(dueOn)) {
    return { error: "Choose the day it is to be paid by.", field: "dueOn" };
  }
  const result = await setPayLater(
    actorOf(admin),
    bookingId,
    clear ? null : dueOn,
  );
  if (!result.ok) return refusalOf(result);
  revalidateLocation();
  return null;
}

/** Undoes the cancel of the booking, or of one trip of it when `itemId` is posted. */
export async function reinstateAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const itemId = textOf(formData.get("itemId"));
  const bookingId = textOf(formData.get("bookingId"));
  if (!itemId && !bookingId) return STALE;
  return finish(
    itemId
      ? await reinstateItem(actorOf(admin), itemId)
      : await reinstateBooking(actorOf(admin), bookingId),
  );
}

/** Corrects the agent the booking came through, or makes it direct. */
export async function setBookingAgentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("bookings.manage");
  if (!admin) return FORBIDDEN;
  const bookingId = textOf(formData.get("bookingId"));
  if (!bookingId) return STALE;
  const result = await setBookingBusiness(
    actorOf(admin),
    bookingId,
    textOf(formData.get("agentId")) || null,
  );
  if (result.ok) revalidateLocation();
  return stateOf(result);
}
