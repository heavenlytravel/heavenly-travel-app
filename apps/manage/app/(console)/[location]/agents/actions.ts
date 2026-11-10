"use server";

import {
  isBusinessStatus,
  parseBusinessFields,
  parseBusinessProfile,
  parseDaysToPay,
  parsePaymentTerms,
  parseReason,
  textOf,
} from "@repo/db";
import {
  changeBusinessTerms,
  createBusiness,
  setBusinessStatus,
  updateBusiness,
} from "@repo/db/server";
import {
  type ActionState,
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  refusalOf,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { actorOf, getAdmin } from "../../../_lib/access";
import { revalidateLocation } from "../../../_lib/revalidate";
import { agentHref } from "../../../_lib/routes";

/**
 * The agents' actions. Reservation, Sales and Finance add an agent and
 * change its details (`agents.manage`); its payment terms and its
 * month-end run are Finance's (`invoices.manage`), as SUPER's. Each
 * re-checks the session and the key, since an action is reachable by a
 * direct POST.
 */

/** Adds an agent from Add agent, and opens its page. */
export async function addAgentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const answer = await addAgentOf(formData);
  return "error" in answer ? answer : { href: agentHref(answer.id) };
}

/** What adding an agent from the booking form answers: the agent, to choose at once, or why not. */
export type AddAgentAnswer =
  { id: string; name: string } | { error: string; field?: string };

/** Adds an agent from New booking's Add an agent, to choose at once. */
export async function addAgentForBookingAction(
  formData: FormData,
): Promise<AddAgentAnswer> {
  return addAgentOf(formData);
}

async function addAgentOf(formData: FormData): Promise<AddAgentAnswer> {
  const admin = await getAdmin("agents.manage");
  if (!admin) return { error: FORBIDDEN_MESSAGE };
  const fields = parseBusinessFields(Object.fromEntries(formData));
  if (!fields.ok) return refusalOf(fields);
  const created = await createBusiness(actorOf(admin), fields.value);
  if (!created.ok) return refusalOf(created);
  revalidateLocation();
  return { id: created.id, name: fields.value.name };
}

/** Saves an agent's profile; its terms are `changeTermsAction`'s. */
export async function updateAgentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("agents.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return STALE;
  const profile = parseBusinessProfile(Object.fromEntries(formData));
  if (!profile.ok) return refusalOf(profile);
  const result = await updateBusiness(actorOf(admin), id, profile.value);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** Changes an agent's terms going forward, with why. Finance's. */
export async function changeTermsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("invoices.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  if (!id) return STALE;
  const terms = parsePaymentTerms(formData.get("paymentTerms"));
  if (!terms.ok) return refusalOf(terms);
  const days = parseDaysToPay(formData.get("daysToPay"));
  if (!days.ok) return refusalOf(days);
  const reason = parseReason(formData.get("reason"), "the terms change");
  if (!reason.ok) return { error: reason.error, field: "reason" };
  const result = await changeBusinessTerms(actorOf(admin), id, {
    paymentTerms: terms.value,
    daysToPay: days.value,
    reason: reason.value,
  });
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

/** Makes an agent active or inactive. */
export async function setAgentStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("agents.manage");
  if (!admin) return FORBIDDEN;
  const id = textOf(formData.get("id"));
  const status = textOf(formData.get("status"));
  if (!id || !isBusinessStatus(status)) return STALE;
  const result = await setBusinessStatus(actorOf(admin), id, status);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}
