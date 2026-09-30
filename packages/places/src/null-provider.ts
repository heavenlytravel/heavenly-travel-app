import { listDistricts, districtShape } from "@repo/db/server";
import { memoize } from "./cache";
import type { PlacesProvider } from "./types";

/**
 * The provider when no Google key is configured: local development and
 * previews. It offers Malaysia's districts as places, each at a point
 * inside its boundary, so a pickup still resolves to a district and hourly
 * bookings work end to end. It cannot route, so one-way trips report
 * distance unavailable, exactly as the domain layer expects. Its ids never
 * reach Google: they carry a `local:` prefix.
 */

const PREFIX = "local:";
const MINUTE = 60_000;

const districts = memoize(() => listDistricts(), {
  key: () => "all",
  ttlMs: MINUTE,
  max: 1,
});

export const nullProvider: PlacesProvider = {
  name: "null",
  canRoute: false,

  async searchPlaces(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const rows = await districts();
    return rows
      .filter((row) => row.name.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((row) => ({
        placeId: `${PREFIX}${row.code}`,
        label: row.name,
        detail: `${row.state.name} (development)`,
      }));
  },

  async resolvePlace(placeId) {
    if (!placeId.startsWith(PREFIX)) return null;
    const code = placeId.slice(PREFIX.length);
    const [rows, shape] = [await districts(), districtShape(code)];
    const row = rows.find((r) => r.code === code);
    if (!row || !shape) return null;
    return {
      placeId,
      label: row.name,
      address: `${row.name}, ${row.state.name}, Malaysia`,
      lat: shape.point[1],
      lng: shape.point[0],
      state: row.state.name,
      district: row.name,
      locality: null,
    };
  },

  async roadDistance() {
    return null;
  },
};
