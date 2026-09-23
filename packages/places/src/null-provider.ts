import { listActiveZoneDistricts, type ZoneDistrict } from "@repo/db/server";
import { memoize } from "./cache";
import type { PlacesProvider } from "./types";

/**
 * The provider when no Google key is configured: local development and
 * previews. It offers the seeded zone districts as places, so a pickup still
 * resolves to a zone and hourly bookings work end to end. It cannot route, so
 * one-way trips report distance unavailable, exactly as the domain layer
 * expects. Its ids never reach Google: they carry a `local:` prefix.
 */

const PREFIX = "local:";
const MINUTE = 60_000;

const districts = memoize(() => listActiveZoneDistricts(), {
  key: () => "all",
  ttlMs: MINUTE,
  max: 1,
});

const idOf = (row: ZoneDistrict) => `${PREFIX}${row.state}/${row.district}`;

export const nullProvider: PlacesProvider = {
  name: "null",
  canRoute: false,

  async searchPlaces(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const rows = await districts();
    return rows
      .filter((row) => row.district.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((row) => ({
        placeId: idOf(row),
        label: row.district,
        detail: `${row.state} (development)`,
      }));
  },

  async resolvePlace(placeId) {
    if (!placeId.startsWith(PREFIX)) return null;
    const rows = await districts();
    const row = rows.find((r) => idOf(r) === placeId);
    if (!row) return null;
    return {
      placeId,
      label: row.district,
      address: `${row.district}, ${row.state}, Malaysia`,
      lat: 0,
      lng: 0,
      state: row.state,
      district: row.district,
      locality: null,
    };
  },

  async roadDistance() {
    return null;
  },
};
