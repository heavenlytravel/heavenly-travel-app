import { todayInMalaysia } from "../data";
import { clashOf, tripsFromSearch, type SearchRow, type Trip } from "../store";

/**
 * What the trip planner checks before a trip joins the list or the search
 * is sent: every field filled, and no trip starting while another is still
 * going.
 */

/** Messages by row and field: "abc.from". */
export type Issues = Record<string, string>;

/** Why rows cannot be sent, by row and field. */
export function check(rows: SearchRow[]): Issues {
  const issues: Issues = {};
  const today = todayInMalaysia();
  for (const row of rows) {
    if (!row.from.trim()) issues[`${row.id}.from`] = "Enter a pick-up place.";
    if (row.mode === "oneway" && !row.to.trim()) {
      issues[`${row.id}.to`] = "Enter a drop-off place.";
    }
    if (!row.date || !row.time) {
      issues[`${row.id}.when`] = "Choose a day and a pick-up time.";
    } else if (row.date < today) {
      issues[`${row.id}.when`] = "Choose a day from today on.";
    }
  }
  return issues;
}

export const hasIssue = (issues: Issues, row: SearchRow) =>
  Object.keys(issues).some((key) => key.startsWith(`${row.id}.`));

/** The trip each row starts during, for the rows that clash: one vehicle cannot do both. */
export function clashesIn(rows: SearchRow[]) {
  const trips = tripsFromSearch(
    rows.filter((r) => r.date && r.time),
    [],
  );
  const found = new Map<string, Trip>();
  for (const trip of trips) {
    const clash = clashOf(trip, trips);
    if (clash) found.set(trip.id, clash);
  }
  return found;
}

/** What stops rows being sent: their issues, the trips they start during, and the first row with either. */
export function problemsIn(rows: SearchRow[]) {
  const issues = check(rows);
  const clashes = clashesIn(rows);
  const wrong = rows.find((r) => hasIssue(issues, r) || clashes.has(r.id));
  return { issues, clashes, wrong };
}

/** The send button: a price for new trips, an update for a booking's own. */
export function sendLabel(count: number, priced: boolean) {
  if (priced) return count > 1 ? "Update my trips" : "Update my trip";
  return count > 1 ? `Get prices · ${count} trips` : "Get my price";
}
