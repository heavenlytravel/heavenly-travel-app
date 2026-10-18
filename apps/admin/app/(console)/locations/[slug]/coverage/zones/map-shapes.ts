/// <reference types="google.maps" />

import {
  isRing,
  ringsOf,
  type MultiPolygon,
  type Ring,
  type ZoneShape,
} from "@repo/db";
import { useEffect, useRef, useState } from "react";
import { loadMapsLibrary, onKeyRefused } from "./google-maps";

/**
 * What the coverage map and the zone maker share: our shapes as Google's
 * paths and back, the map loaded once with the districts drawn under it,
 * and why a map shows nothing useful. Browser only; the zones' colours are
 * in ./zone-colors, for the server page too.
 */

/** A district's outline, for context under the zones. */
export type DistrictOutline = { name: string; polygons: MultiPolygon };

/** The districts of one state, as the zone maker offers them. */
export type DistrictChoice = {
  state: string;
  districts: { code: string; name: string }[];
};

/** Another zone of the location, drawn but not editable. */
export type OtherZone = { name: string; shape: ZoneShape };

export const toLatLng = ([lng, lat]: [
  number,
  number,
]): google.maps.LatLngLiteral => ({ lat, lng });

/** An open path for Google: our rings repeat the first corner at the end. */
export function pathOf(ring: Ring): google.maps.LatLngLiteral[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  const open =
    ring.length > 1 &&
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
      ? ring.slice(0, -1)
      : ring;
  return open.map(toLatLng);
}

/** Every ring of a shape as Google paths: one for a drawn zone, several for a district of islands. */
export function pathsOf(shape: ZoneShape): google.maps.LatLngLiteral[][] {
  return ringsOf(shape).map(pathOf);
}

/** A Google path back to our ring, closed. */
export function ringOfPath(
  path: google.maps.MVCArray<google.maps.LatLng>,
): Ring {
  const ring: Ring = path
    .getArray()
    .map((point: google.maps.LatLng) => [point.lng(), point.lat()]);
  if (ring.length > 0) ring.push(ring[0]!);
  return ring;
}

/**
 * How many rings each polygon of a shape has, so the flat list of paths a
 * Google polygon holds can be put back into polygons; null for one ring.
 */
export function layoutOf(shape: ZoneShape): number[] | null {
  return isRing(shape) ? null : shape.map((polygon) => polygon.length);
}

/** The rings of a Google polygon as our shape again, in the layout it was drawn from. */
export function shapeOfRings(
  rings: readonly Ring[],
  layout: readonly number[] | null,
): ZoneShape {
  if (layout === null) return rings[0] ?? [];
  const polygons: MultiPolygon = [];
  let at = 0;
  for (const count of layout) {
    polygons.push(rings.slice(at, at + count));
    at += count;
  }
  return polygons;
}

/** The bounds of every corner of the shapes given. */
export function boundsOf(shapes: readonly ZoneShape[]) {
  const bounds = new google.maps.LatLngBounds();
  for (const shape of shapes) {
    for (const ring of ringsOf(shape)) {
      for (const point of ring) bounds.extend(toLatLng(point));
    }
  }
  return bounds;
}

export const sameShape = (a: ZoneShape | null, b: ZoneShape | null) =>
  JSON.stringify(a) === JSON.stringify(b);

export const DISTRICT_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#737373",
  strokeWeight: 1,
  fillColor: "#737373",
  fillOpacity: 0.06,
  clickable: false,
};

/** Why the map shows nothing useful, as the line under it says. */
export const MAP_FAILURES = {
  load: "The map did not load. Check the browser key and the network.",
  refused:
    "Google refused the browser key. In its Google Cloud project, enable the Maps JavaScript API and allow it on the key, and allow this site's address among the key's referrers.",
} as const;

/** Malaysia, for a map with nothing on it yet. */
const MALAYSIA = { center: { lat: 4.2, lng: 108.0 }, zoom: 6 };

/**
 * Loads Google's map into `host` once, with the districts drawn in grey
 * under whatever the caller adds, and answers the map and its library once
 * they are there, or why there is no map.
 */
export function useGoogleMap(
  mapKey: string,
  districts: readonly DistrictOutline[],
) {
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<{
    map: google.maps.Map;
    library: google.maps.MapsLibrary;
  } | null>(null);
  const [failed, setFailed] = useState<keyof typeof MAP_FAILURES | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stopListening = onKeyRefused(() => {
      if (!cancelled) setFailed("refused");
    });
    loadMapsLibrary(mapKey)
      .then((library) => {
        if (cancelled || !host.current) return;
        const map = new library.Map(host.current, {
          ...MALAYSIA,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        for (const district of districts) {
          for (const rings of district.polygons) {
            new library.Polygon({
              ...DISTRICT_STYLE,
              paths: rings.map(pathOf),
              map,
            });
          }
        }
        setLoaded({ map, library });
      })
      .catch(() => {
        if (!cancelled) setFailed("load");
      });
    return () => {
      cancelled = true;
      stopListening();
    };
    // The districts are the page's; they do not change while the map is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey]);

  return {
    host,
    map: loaded?.map ?? null,
    library: loaded?.library ?? null,
    failed,
  };
}
