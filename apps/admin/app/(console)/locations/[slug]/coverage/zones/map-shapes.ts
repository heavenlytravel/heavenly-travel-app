/// <reference types="google.maps" />

import {
  ringsOf,
  type MultiPolygon,
  type Ring,
  type ZoneShape,
} from "@repo/db";
import { useEffect, useRef, useState } from "react";
import { loadMapsLibrary, onKeyRefused } from "./google-maps";

/**
 * What the coverage map and the zone maker share: our shapes as Google's
 * paths, the map loaded once with the districts drawn under it,
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

/** A mukim of the district picked, to tick and to draw on the map. */
export type MukimChoice = {
  code: string;
  name: string;
  /** "Mukim", "Bandar", "Pekan", "Land district", "Town district". */
  kind: string;
  polygons: MultiPolygon;
};

/**
 * Another zone, drawn but not editable: one of the location's, or, with
 * `location`, another location's, which this one may not overlap either.
 */
export type OtherZone = {
  id: string;
  name: string;
  shape: ZoneShape;
  location?: string;
};

export const toLatLng = ([lng, lat]: [
  number,
  number,
]): google.maps.LatLngLiteral => ({ lat, lng });

/** The ring without its first corner repeated at the end, as Google and the piece editor take it. */
export function openRing(ring: Ring): Ring {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return ring.length > 1 &&
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
    ? ring.slice(0, -1)
    : ring;
}

/** An open path for Google: our rings repeat the first corner at the end. */
export function pathOf(ring: Ring): google.maps.LatLngLiteral[] {
  return openRing(ring).map(toLatLng);
}

/** Every ring of a shape as Google paths: one for a drawn zone, several for a district of islands. */
export function pathsOf(shape: ZoneShape): google.maps.LatLngLiteral[][] {
  return ringsOf(shape).map(pathOf);
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
 * they are there, or why there is no map. With `ownFullScreen`, Google's
 * full-screen button is left off: Google's full screen shows the map
 * alone, and the caller puts more of its own on screen with it.
 */
export function useGoogleMap(
  mapKey: string,
  districts: readonly DistrictOutline[],
  { ownFullScreen = false }: { ownFullScreen?: boolean } = {},
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
          fullscreenControl: !ownFullScreen,
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
    // The districts and the full-screen choice are the page's; they do not
    // change while the map is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey]);

  return {
    host,
    map: loaded?.map ?? null,
    library: loaded?.library ?? null,
    failed,
  };
}
