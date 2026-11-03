import { includesGuide, type TripCategory } from "@repo/db";

/**
 * What the Add-ons step shows for a category: what comes with its
 * vehicle and, later, what the customer may add. A category with none
 * skips the step. A coach's tour guide is included; a car's is priced
 * once Ops settles how (docs/261103-tour-guide.md), and joins this list
 * then. Browser-safe.
 */

/** One add-on as the step and the confirm page show it. */
export type AddOn = {
  key: "tour-guide";
  name: string;
  description: string;
  /** In the price: shown, with nothing to choose. */
  included: true;
};

const TOUR_GUIDE_INCLUDED: AddOn = {
  key: "tour-guide",
  name: "Tour guide",
  description:
    "A licensed tour guide comes with every coach trip, at no extra charge.",
  included: true,
};

/** The add-ons of a category, in the order shown; empty skips the step. */
export function addOnsOf(category: TripCategory): AddOn[] {
  return includesGuide(category) ? [TOUR_GUIDE_INCLUDED] : [];
}
