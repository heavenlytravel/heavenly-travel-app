/// <reference types="google.maps" />

"use client";

import type { LngLat, ZoneShape } from "@repo/db";
import { useEffect, useRef } from "react";
import {
  MAP_FAILURES,
  boundsOf,
  pathsOf,
  useGoogleMap,
} from "../../coverage/zones/map-shapes";
import type { MapLayer } from "./explain";

/** A pin of the trip: where it is, and its letter on the map. */
export type TripPin = { at: LngLat; letter: "A" | "B" };

const toLatLng = ([lng, lat]: LngLat) => ({ lat, lng });

/** The pricing's colours, as the demo drew them: dark trip, orange extra road, green grid trip, purple entry spots. */
const COLORS = {
  trip: "#0f172a",
  extra: "#ea580c",
  grid: "#16a34a",
  route: "#94a3b8",
  straight: "#64748b",
  entry: "#7c3aed",
  edge: "#16a34a",
  target: "#64748b",
  zone: "#2563eb",
} as const;

/** A line in a style: solid, or drawn as repeated dashes or dots. */
function lineOptions(style: Extract<MapLayer, { kind: "line" }>["style"]) {
  const color = COLORS[style];
  const repeat = (
    path: string | google.maps.SymbolPath,
    scale: number,
    gap: string,
  ) => ({
    strokeOpacity: 0,
    icons: [
      {
        icon: { path, strokeOpacity: 1, strokeColor: color, scale },
        offset: "0",
        repeat: gap,
      },
    ],
  });
  switch (style) {
    case "trip":
      return { strokeColor: color, strokeWeight: 5, strokeOpacity: 0.9 };
    case "route":
      return { strokeColor: color, strokeWeight: 4, strokeOpacity: 0.6 };
    case "extra":
      return repeat("M 0,-1 0,1", 3, "14px");
    case "grid":
      return repeat(google.maps.SymbolPath.CIRCLE, 2.5, "10px");
    case "straight":
      return repeat(google.maps.SymbolPath.CIRCLE, 1.5, "8px");
  }
}

/**
 * Try a trip's map: the location's zones, filled and named on hover, the
 * two pins, and the layers of the view shown. A click drops the pin being
 * placed; a pin dragged and let go moves. The price is worked out again
 * on the drop, not while a pin moves, since each try makes real calls.
 */
export function TripMap({
  mapKey,
  zones,
  pins,
  layers,
  onPlace,
  onMove,
}: {
  mapKey: string;
  zones: { id: string; name: string; shape: ZoneShape }[];
  pins: TripPin[];
  layers: MapLayer[];
  /** A click on the map, where it was. */
  onPlace: (at: LngLat) => void;
  /** A pin dragged and let go, where it now is. */
  onMove: (letter: TripPin["letter"], at: LngLat) => void;
}) {
  const { host, map, library, failed } = useGoogleMap(mapKey, []);
  const callbacks = useRef({ onPlace, onMove });
  useEffect(() => {
    callbacks.current = { onPlace, onMove };
  }, [onPlace, onMove]);

  // The zones, once the map is there, framed on them; a click places a pin.
  useEffect(() => {
    if (!map || !library) return;
    const drawn = zones.map((zone) => {
      const polygon = new library.Polygon({
        paths: pathsOf(zone.shape),
        strokeColor: COLORS.zone,
        strokeWeight: 1.5,
        fillColor: COLORS.zone,
        fillOpacity: 0.12,
        map,
      });
      polygon.addListener("click", (event: google.maps.PolyMouseEvent) => {
        if (event.latLng) {
          callbacks.current.onPlace([event.latLng.lng(), event.latLng.lat()]);
        }
      });
      return polygon;
    });
    const listener = map.addListener(
      "click",
      (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          callbacks.current.onPlace([event.latLng.lng(), event.latLng.lat()]);
        }
      },
    );
    const bounds = boundsOf(zones.map((zone) => zone.shape));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 24);
    return () => {
      for (const polygon of drawn) polygon.setMap(null);
      listener.remove();
    };
    // The zones are the page's; a change reloads the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library]);

  // The pins, draggable; redrawn when they move.
  useEffect(() => {
    if (!map) return;
    const markers = pins.map((pin) => {
      const marker = new google.maps.Marker({
        position: toLatLng(pin.at),
        label: { text: pin.letter, color: "white", fontWeight: "600" },
        draggable: true,
        map,
        zIndex: 10,
      });
      marker.addListener("dragend", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          callbacks.current.onMove(pin.letter, [
            event.latLng.lng(),
            event.latLng.lat(),
          ]);
        }
      });
      return marker;
    });
    return () => {
      for (const marker of markers) marker.setMap(null);
    };
  }, [map, pins]);

  // The view's lines and dots.
  useEffect(() => {
    if (!map || !library) return;
    const shapes: { setMap: (map: null) => void }[] = layers.map((layer) =>
      layer.kind === "line"
        ? new library.Polyline({
            path: layer.path.map(toLatLng),
            ...lineOptions(layer.style),
            clickable: false,
            map,
            zIndex: layer.style === "route" ? 2 : 4,
          })
        : new library.Circle({
            center: toLatLng(layer.at),
            radius: 60,
            strokeColor: COLORS[layer.style],
            strokeWeight: 2,
            fillColor: COLORS[layer.style],
            fillOpacity: layer.style === "target" ? 0.2 : 0.9,
            clickable: false,
            map,
            zIndex: 6,
          }),
    );
    return () => {
      for (const shape of shapes) shape.setMap(null);
    };
  }, [map, library, layers]);

  return (
    <div className="grid gap-2">
      <div className="relative isolate">
        <div
          ref={host}
          role="application"
          aria-label="Map of the zones and the trip"
          className="h-[28rem] w-full rounded-md border border-slate-200 bg-slate-100"
        />
      </div>
      {failed ? (
        <p className="text-sm text-red-700">{MAP_FAILURES[failed]}</p>
      ) : null}
    </div>
  );
}
