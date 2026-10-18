import type { DropoffRule } from "@repo/db";

/** What each drop-off rule means for a trip from the location, in a sentence. */
export function dropoffRuleNote(rule: DropoffRule, locationName: string) {
  switch (rule) {
    case "anywhere":
      return "A trip may end anywhere in Malaysia: at the grid price where the route has one, metered otherwise.";
    case "zones":
      return `The drop-off must be in one of ${locationName}'s zones: at the grid price where the route has one, metered otherwise. Any other drop-off is refused.`;
    case "grid":
      return "Only a route with a price on the grid can be booked, and only in the classes priced on it. Nothing is metered.";
  }
}
