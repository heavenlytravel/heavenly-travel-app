import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import type { Change } from "./change";
import { refuse } from "./change";
import { db } from "./client";
import { GUIDE_RATE_PRICES, type GuideRateRow } from "./guide-rates-input";

/**
 * Locations' tour guide price lists in the database: the reader the quote
 * and Guide Rates share, and the page's writer. See ./guide-rates-input
 * for the rules.
 */

type Client = Pick<typeof db, "guideRate">;

const ROW_SELECT = {
  locationId: true,
  language: true,
  isActive: true,
  oneWaySen: true,
  hours4Sen: true,
  hours8Sen: true,
  hours12Sen: true,
  extraHourSen: true,
} as const;

/** Several locations' guide rates by location id, in one query, each in its list's order. A location with none has an empty list. */
export async function listGuideRates(
  locationIds: readonly string[],
  client: Client = db,
): Promise<Map<string, GuideRateRow[]>> {
  const rows = await client.guideRate.findMany({
    where: { locationId: { in: [...locationIds] } },
    orderBy: [{ position: "asc" }, { language: "asc" }],
    select: ROW_SELECT,
  });
  return new Map(
    locationIds.map((id) => [
      id,
      rows
        .filter((row) => row.locationId === id)
        .map((row): GuideRateRow => ({
          language: row.language,
          isActive: row.isActive,
          oneWaySen: row.oneWaySen,
          hours4Sen: row.hours4Sen,
          hours8Sen: row.hours8Sen,
          hours12Sen: row.hours12Sen,
          extraHourSen: row.extraHourSen,
        })),
    ]),
  );
}

/** A location's guide rates, for Guide Rates. */
export async function getGuideRates(
  locationId: string,
): Promise<GuideRateRow[]> {
  return (await listGuideRates([locationId])).get(locationId)!;
}

/** The rows as the log keeps them, in their order: a move is a change. */
const summaryOf = (rows: readonly GuideRateRow[]) =>
  rows.map((row) => ({
    language: row.language,
    isActive: row.isActive,
    ...Object.fromEntries(GUIDE_RATE_PRICES.map((key) => [key, row[key]])),
  }));

/**
 * Saves a location's whole guide rate list as the page posts it, in its
 * order, in place of the one stored. A booking keeps its own receipt, so nothing booked
 * changes. Saving what is already there logs nothing.
 */
export async function setGuideRates(
  actor: Actor,
  locationId: string,
  rows: readonly GuideRateRow[],
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) {
      return refuse(
        "This location was deleted meanwhile. Go back to Locations.",
      );
    }
    const before = (await listGuideRates([locationId], tx)).get(locationId)!;
    const was = summaryOf(before);
    const now = summaryOf(rows);
    if (JSON.stringify(was) === JSON.stringify(now)) return { ok: true };

    await tx.guideRate.deleteMany({ where: { locationId } });
    if (rows.length > 0) {
      await tx.guideRate.createMany({
        data: rows.map((row, position) => ({ locationId, position, ...row })),
      });
    }
    await logActivity(tx, actor, {
      action: "location.guide-rates.updated",
      entityId: locationId,
      before: { rows: was },
      after: { rows: now },
    });
    return { ok: true };
  });
}
