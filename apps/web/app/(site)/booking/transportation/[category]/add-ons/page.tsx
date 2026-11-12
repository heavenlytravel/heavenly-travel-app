import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bookableCategory } from "../../../../../_lib/transportation-booking";
import { AddOnsStep } from "./AddOnsStep";

export const metadata: Metadata = {
  title: "Add-ons | Heavenly Travel",
};

/**
 * Route: /booking/transportation/car-with-driver/add-ons
 * The step between the vehicle and the details: what the trips can take
 * besides the vehicle, the tour guide today. The trips are the customer's
 * plan in the browser, so the page itself is the shell. A plan with no
 * add-on to offer goes on to the details. See
 * docs/261111-catalogue-booking-flow-and-ops.md, part B.
 */
export default async function AddOnsPage({
  params,
}: PageProps<"/booking/transportation/[category]/add-ons">) {
  const category = bookableCategory((await params).category);
  if (!category) notFound();
  return <AddOnsStep category={category} />;
}
