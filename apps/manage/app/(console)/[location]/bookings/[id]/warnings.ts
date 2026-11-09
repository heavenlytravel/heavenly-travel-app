import { isAmendWarning, type AmendWarning } from "@repo/db";

/** The field of a booking page's address naming what an amend no longer fits: "class,time". */
export const WARN_PARAM = "changed";

/** The warnings an amend's address names, those this code knows. */
export function warningsOf(param: unknown): AmendWarning[] {
  return typeof param === "string"
    ? param.split(",").filter(isAmendWarning)
    : [];
}
