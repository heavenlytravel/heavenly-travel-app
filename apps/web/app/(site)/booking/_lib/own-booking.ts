import { bookingLabelOf, bookingRefOfPath } from "@repo/db";
import { getAccess, getBookingForUser } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { signInHref } from "../../../_lib/routes";

/**
 * The booking behind a `[number]` route segment (HTB-1042, or HTQ-0012
 * while it waits to be confirmed), for its owner only. A quotation since
 * confirmed opens under its HTB. A malformed number, an unknown one or someone else's all 404, so
 * the page never hints that a booking exists; an old random reference
 * (HT-7K3QZM) opens nothing. Signed-out visitors go to sign-in and come
 * back to `hrefOf(segment)`.
 */
export async function requireOwnBooking(
  segment: string,
  hrefOf: (number: string) => string,
) {
  const ref = bookingRefOfPath(segment);
  if (ref === null) notFound();

  const access = await getAccess("user");
  if (access.status === "signed-out") redirect(signInHref(hrefOf(segment)));

  const booking = await getBookingForUser(ref, access.user.id);
  if (!booking) notFound();
  const label = bookingLabelOf(booking);
  if (label !== decodeURIComponent(segment)) redirect(hrefOf(label));
  return booking;
}
