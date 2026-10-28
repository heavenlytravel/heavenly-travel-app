"use server";

import {
  answerAsDriver,
  isDeclineReason,
  isTripEventKind,
  reportTripEvent,
  textOf,
} from "@repo/db/server";
import { sendDriverEmailFor } from "@repo/email";
import { type ActionState, refusalOf, STALE } from "@repo/console/action-state";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { actorOf, getDriverAccess } from "./_lib/access";

/**
 * A driver's actions in Connect: answering an offer and reporting a trip.
 * Each asks who is signed in again, since actions are reachable by direct
 * POST, and lets the writer in @repo/db check that the job is theirs.
 */

const NOT_A_DRIVER: ActionState = {
  error: "You are not signed in as a driver. Reload the page.",
};

/** Accept or decline an offer: every trip of it, together. */
export async function answerOfferAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getDriverAccess();
  if (!access) return NOT_A_DRIVER;
  const offerId = textOf(formData.get("offerId"));
  const accept = textOf(formData.get("answer")) === "accept";
  const reason = textOf(formData.get("reason"));
  if (!offerId) return STALE;
  let answer: Parameters<typeof answerAsDriver>[3];
  if (accept) answer = { accept: true };
  else if (isDeclineReason(reason)) {
    answer = { accept: false, reason, note: textOf(formData.get("note")) };
  } else return { error: "Choose why.", field: "reason" };
  const result = await answerAsDriver(
    actorOf(access.user),
    access.driver,
    offerId,
    answer,
  );
  if (!result.ok) return refusalOf(result);
  for (const id of result.assigned ?? []) after(() => sendDriverEmailFor(id));
  revalidatePath("/");
  return null;
}

/** What a tap from the phone carries; sent again until it arrives. */
export type TapPayload = {
  itemId: string;
  kind: string;
  /** ISO, by the phone's clock. */
  at: string;
  note: string | null;
  clientId: string;
};

/**
 * Keeps one tap. A tap the server already kept answers ok, so the phone
 * may send its queue again without counting twice. Answers why not when
 * it is refused, so the phone drops it and says so.
 */
export async function reportTapAction(
  tap: TapPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await getDriverAccess();
  if (!access)
    return { ok: false, error: "You are not signed in as a driver." };
  if (
    typeof tap?.itemId !== "string" ||
    !isTripEventKind(tap.kind) ||
    typeof tap.clientId !== "string" ||
    typeof tap.at !== "string"
  ) {
    return { ok: false, error: "This tap did not arrive whole. Tap again." };
  }
  const result = await reportTripEvent(
    actorOf(access.user),
    { driver: access.driver },
    {
      itemId: tap.itemId,
      kind: tap.kind,
      at: new Date(tap.at),
      note: typeof tap.note === "string" ? tap.note : null,
      clientId: tap.clientId,
    },
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/");
  revalidatePath(`/jobs/${tap.itemId}`);
  return { ok: true };
}
