import type { Change, Refusal } from "@repo/db";

/**
 * What a form's server action answers, for `useActionForm`: null when the
 * change went through and the form stays; the page to open when it went
 * through and the form leaves; or why not, in a sentence saying what to
 * do, with the `name` of the form's field it is about when it is about
 * one. Every action checks the permission again, because actions are
 * reachable by direct POST.
 */
export type ActionState =
  null | { href: string } | { error: string; field?: string };

export const FORBIDDEN_MESSAGE =
  "Your teams cannot do this. Ask a SUPER admin.";

export const FORBIDDEN: ActionState = { error: FORBIDDEN_MESSAGE };

export const STALE_MESSAGE =
  "This page is out of date. Reload it and try again.";

/** What an action answers when the form lacks what the page put in it: a page left open too long, or edited. */
export const STALE: ActionState = { error: STALE_MESSAGE };

/** A writer's refusal as the form's state, naming its field when it has one. */
export function refusalOf(refusal: Refusal): ActionState {
  return refusal.field
    ? { error: refusal.error, field: refusal.field }
    : { error: refusal.error };
}

/** A writer's answer as the form's state. */
export function stateOf(change: Change): ActionState {
  return change.ok ? null : refusalOf(change);
}

/** The sentence of a state that refuses; null for one that went through. */
export function errorOf(state: ActionState): string | null {
  return state && "error" in state ? state.error : null;
}
