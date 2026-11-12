import {
  guideOfferIssue,
  guideOffersOnAll,
  needsGuide,
  type GuideChoice,
  type GuideOffer,
  type TripCategory,
} from "@repo/db";
import {
  quoteOf,
  type PlannedTrip,
  type PricedTrips,
  type TripQuoteView,
} from "../../../../_lib/trip-plan";

/** The plan's tour guide as the steps read it. */
export type GuideAddOn = {
  /** Each trip's quote as last priced, in the trips' order; undefined while one is not. */
  views: (TripQuoteView | undefined)[];
  /** The languages on sale for every trip, at the sum of their prices; none until every trip is priced. */
  offers: GuideOffer[];
  /** A coach's: the guide cannot be left off. */
  required: boolean;
  /** The choice, a coach's first language on sale until one is chosen. */
  guide: GuideChoice;
  /** Why the choice cannot be booked as it is; null when it can. */
  issue: string | null;
};

/**
 * The add-ons the trips can take, today the tour guide: what the vehicle
 * step asks to decide where Book now goes (the add-ons step when there is
 * any to offer, else straight to the details), what the add-ons step
 * offers, and what the confirm step prices. See
 * docs/261111-catalogue-booking-flow-and-ops.md, part B.
 */
export function guideAddOnOf({
  category,
  trips,
  priced,
  complete,
  guide,
}: {
  category: TripCategory;
  trips: readonly PlannedTrip[];
  priced: PricedTrips | null;
  /** Every trip priced. */
  complete: boolean;
  guide: GuideChoice;
}): GuideAddOn {
  const views = trips.map((trip) => quoteOf(priced, trip)?.view);
  const offers =
    complete && views.every((view) => view?.ok)
      ? guideOffersOnAll(views.map((view) => (view?.ok ? view.guides : [])))
      : [];
  const required = needsGuide(category) && offers.length > 0;
  const chosen =
    required && guide.language === null
      ? { ...guide, language: offers[0]!.language }
      : guide;
  return {
    views,
    offers,
    required,
    guide: chosen,
    issue: complete ? guideOfferIssue(chosen.language, offers) : null,
  };
}

/** "the trip", "both trips", "all 3 trips": what an add-on is for. */
export function forWhichOf(count: number) {
  return count === 2
    ? "both trips"
    : count > 1
      ? `all ${count} trips`
      : "the trip";
}
