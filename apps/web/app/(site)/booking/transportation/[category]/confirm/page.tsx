import type { Metadata } from "next";
import {
  fullName,
  parseTripOptions,
  parseTripSearch,
  toParams,
} from "@repo/db";
import { getAccess } from "@repo/db/server";
import { notFound } from "next/navigation";
import { signInHref } from "../../../../../_lib/routes";
import {
  bookableCategory,
  tripConfirmPath,
} from "../../../../../_lib/transportation-booking";
import { ConfirmStep } from "./ConfirmStep";

export const metadata: Metadata = {
  title: "Confirm your booking | Heavenly Travel",
};

/**
 * Route: /booking/transportation/car-with-driver/confirm
 * The last look before the booking exists: the trips, the one vehicle,
 * the prices and the contact details. The trips are the customer's plan in
 * the browser; this shell gives the page the account's details. No account
 * is needed. A signed-in customer gets the details filled in; a visitor is
 * offered sign-in, which comes back here with the plan intact. A link with
 * today's one-trip confirm address still opens it. See
 * docs/261008-guest-booking.md and docs/261027-multi-trip-booking.md.
 */
export default async function ConfirmPage({
  params,
  searchParams,
}: PageProps<"/booking/transportation/[category]/confirm">) {
  const category = bookableCategory((await params).category);
  if (!category) notFound();
  const query = toParams(await searchParams);
  const search = parseTripSearch(query);
  const options = parseTripOptions(category, query);

  const access = await getAccess("user");
  const user = access.status === "ok" ? access.user : null;
  return (
    <ConfirmStep
      category={category}
      seed={search && options ? { search, options } : null}
      defaultName={user ? fullName(user) : ""}
      defaultPhone={user?.phone ?? ""}
      accountEmail={user?.email ?? null}
      signInHref={user ? null : signInHref(tripConfirmPath(category))}
    />
  );
}
