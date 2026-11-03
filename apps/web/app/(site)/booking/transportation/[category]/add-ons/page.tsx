import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { addOnsOf } from "../../../../../_lib/booking-add-ons";
import {
  bookableCategory,
  tripConfirmPath,
} from "../../../../../_lib/transportation-booking";
import { AddOnsStep } from "./AddOnsStep";

export const metadata: Metadata = {
  title: "Add-ons | Heavenly Travel",
};

/**
 * Route: /booking/transportation/coach-charter/add-ons
 * Between choosing the vehicle and Confirm: what comes with the vehicle
 * and what may be added (../../../../../_lib/booking-add-ons). A coach's
 * tour guide is included. A category with no add-on skips the step, to
 * Confirm. The trips are the customer's plan in the browser; nothing is
 * posted here. See docs/261103-tour-guide.md.
 */
export default async function AddOnsPage({
  params,
}: PageProps<"/booking/transportation/[category]/add-ons">) {
  const category = bookableCategory((await params).category);
  if (!category) notFound();
  const addOns = addOnsOf(category);
  if (addOns.length === 0) redirect(tripConfirmPath(category));
  return <AddOnsStep category={category} addOns={addOns} />;
}
