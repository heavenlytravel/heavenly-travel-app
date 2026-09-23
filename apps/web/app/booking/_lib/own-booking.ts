import { isReference, normalizeReference } from "@repo/db";
import { getAccess, getBookingForUser } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { signInHref } from "../../_lib/routes";

/**
 * The booking behind a `[reference]` route segment, for its owner only. A
 * malformed reference, an unknown one or someone else's all 404, so the
 * page never hints that a reference exists. Signed-out visitors go to
 * sign-in and come back to `hrefOf(reference)`.
 */
export async function requireOwnBooking(
  raw: string,
  hrefOf: (reference: string) => string,
) {
  const reference = normalizeReference(raw);
  if (!isReference(reference)) notFound();

  const access = await getAccess("user");
  if (access.status === "signed-out") redirect(signInHref(hrefOf(reference)));

  const booking = await getBookingForUser(reference, access.user.id);
  if (!booking) notFound();
  return booking;
}
