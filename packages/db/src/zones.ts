import { db } from "./client";
import type { Zone } from "./generated/prisma/client";
import type { Place } from "./place";

export type { Zone };

export function listActiveZones(): Promise<Zone[]> {
  return db.zone.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/**
 * The zone a place falls in, active or not (callers decide what an inactive
 * zone means). Google spells the district in administrative_area_level_2 or,
 * often in Malaysia, only in locality, so both are tried, district first.
 * The state breaks a tie when two zones list the same name.
 */
export async function resolveZone(
  place: Pick<Place, "state" | "district" | "locality">,
): Promise<Zone | null> {
  const candidates = [place.district, place.locality].filter(
    (name): name is string => Boolean(name),
  );
  if (candidates.length === 0) return null;

  const rows = await db.zoneDistrict.findMany({
    where: { district: { in: candidates, mode: "insensitive" } },
    include: { zone: true },
  });
  if (rows.length === 0) return null;

  const rank = (name: string) =>
    candidates.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  const sameState = (state: string) =>
    place.state !== null && state.toLowerCase() === place.state.toLowerCase();

  rows.sort(
    (a, b) =>
      rank(a.district) - rank(b.district) ||
      Number(sameState(b.state)) - Number(sameState(a.state)),
  );
  return rows[0]?.zone ?? null;
}
