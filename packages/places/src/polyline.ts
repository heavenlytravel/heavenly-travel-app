import type { LngLat } from "@repo/db";

/**
 * Google's encoded polyline as a line of [lng, lat], the order the zones
 * are stored in. The format: each coordinate a difference from the one
 * before, at five decimals, zig-zag signed, in chunks of five bits offset
 * by 63. See
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm.
 */
export function decodePolyline(encoded: string): LngLat[] {
  const line: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) throw new RangeError("a cut-off polyline");
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    line.push([lng / 1e5, lat / 1e5]);
  }
  return line;
}
