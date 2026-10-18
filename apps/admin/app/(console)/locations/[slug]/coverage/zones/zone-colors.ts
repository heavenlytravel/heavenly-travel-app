/**
 * The colours that tell a location's zones apart, on the map and beside
 * each in the list, by the zone's place in the location's order. Plain
 * values, so the server page and the map read the same.
 */
export const ZONE_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#db2777",
  "#7c3aed",
  "#0891b2",
  "#65a30d",
  "#dc2626",
] as const;

export const zoneColor = (index: number) =>
  ZONE_COLORS[index % ZONE_COLORS.length]!;
