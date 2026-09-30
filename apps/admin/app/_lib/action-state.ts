import type { Change } from "@repo/db";

/**
 * What a form's server action answers, for `useActionState`: null when the
 * change went through, or the sentence the form shows. Every action checks
 * the permission again, because actions are reachable by direct POST.
 */
export type ActionState = { error: string } | null;

export const FORBIDDEN_MESSAGE =
  "Your teams cannot do this. Ask a SUPER admin.";

export const FORBIDDEN: ActionState = { error: FORBIDDEN_MESSAGE };

/** A writer's answer as the form's state. */
export function stateOf(change: Change): ActionState {
  return change.ok ? null : { error: change.error };
}
