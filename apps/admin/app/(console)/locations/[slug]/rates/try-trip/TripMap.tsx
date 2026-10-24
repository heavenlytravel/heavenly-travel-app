/// <reference types="google.maps" />

"use client";

import type { LngLat, ZoneShape } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { useEffect, useRef, useState } from "react";
import {
  MAP_FAILURES,
  boundsOf,
  pathsOf,
  useGoogleMap,
} from "../../coverage/zones/map-shapes";
import type { LayerKey, MapLayer } from "./explain";

/** A pin of the trip: where it is, and its letter on the map. */
export type TripPin = { at: LngLat; letter: "A" | "B" };

const toLatLng = ([lng, lat]: LngLat) => ({ lat, lng });

/** The pricing's colours, as the demo drew them: dark trip, orange extra road, green grid trip, purple entry spots. */
export const MAP_COLORS = {
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

/** A line in a style: solid, or drawn as repeated dashes or dots; bolder when lit, fainter when another is. */
function lineOptions(
  style: Extract<MapLayer, { kind: "line" }>["style"],
  emphasis: "lit" | "dim" | "plain",
) {
  const color = MAP_COLORS[style];
  const grow = emphasis === "lit" ? 1.6 : 1;
  const opacity = emphasis === "dim" ? 0.25 : 1;
  const repeat = (
    path: string | google.maps.SymbolPath,
    scale: number,
    gap: string,
  ) => ({
    strokeOpacity: 0,
    // An invisible stroke wide enough to point at.
    strokeWeight: 12,
    icons: [
      {
        icon: {
          path,
          strokeOpacity: opacity,
          strokeColor: color,
          scale: scale * grow,
        },
        offset: "0",
        repeat: gap,
      },
    ],
  });
  switch (style) {
    case "trip":
      return {
        strokeColor: color,
        strokeWeight: 5 * grow,
        strokeOpacity: 0.9 * opacity,
      };
    case "route":
      return {
        strokeColor: color,
        strokeWeight: 4,
        strokeOpacity: 0.6 * opacity,
      };
    case "extra":
      return repeat("M 0,-1 0,1", 3, "14px");
    case "grid":
      return repeat(google.maps.SymbolPath.CIRCLE, 2.5, "10px");
    case "straight":
      return repeat(google.maps.SymbolPath.CIRCLE, 1.5, "8px");
  }
}

/** What the pointer is on: its words and where, in the map's own pixels. */
type Hover = { label: string; x: number; y: number };

/**
 * Try a trip's map: the location's zones, named on hover, the two pins,
 * and the layers of the view shown. Pointing at a line or a dot says what
 * it measures; the layers of `focus` are drawn bolder and the rest
 * fainter. A click drops the pin being placed, on a line too; a pin
 * dragged and let go moves. The price is worked out again on the drop,
 * not while a pin moves, since each try makes real calls. A new `frame`
 * fits the view to the pins and the layers. `className` sizes the map.
 */
export function TripMap({
  mapKey,
  zones,
  pins,
  layers,
  focus,
  frame,
  className,
  onPlace,
  onMove,
}: {
  mapKey: string;
  zones: { id: string; name: string; shape: ZoneShape }[];
  pins: TripPin[];
  layers: MapLayer[];
  focus: readonly LayerKey[];
  /** Changed to fit the view to what is drawn: once per answer. */
  frame: number;
  className?: string;
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
  const [hover, setHover] = useState<Hover | null>(null);

  // The pointer's place over the map, from the event Google passes on.
  const hoverAt = (label: string, event: google.maps.MapMouseEvent) => {
    const dom = event.domEvent;
    const box = host.current?.getBoundingClientRect();
    if (!box || !dom || !("clientX" in dom)) return;
    setHover({ label, x: dom.clientX - box.left, y: dom.clientY - box.top });
  };
  const place = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      callbacks.current.onPlace([event.latLng.lng(), event.latLng.lat()]);
    }
  };

  // The zones, once the map is there, framed on them; a click places a pin.
  useEffect(() => {
    if (!map || !library) return;
    const drawn = zones.map((zone) => {
      const polygon = new library.Polygon({
        paths: pathsOf(zone.shape),
        strokeColor: MAP_COLORS.zone,
        strokeWeight: 1.5,
        fillColor: MAP_COLORS.zone,
        fillOpacity: 0.12,
        map,
      });
      polygon.addListener("click", place);
      polygon.addListener("mousemove", (event: google.maps.MapMouseEvent) =>
        hoverAt(zone.name, event),
      );
      polygon.addListener("mouseout", () => setHover(null));
      return polygon;
    });
    const listener = map.addListener("click", place);
    const bounds = boundsOf(zones.map((zone) => zone.shape));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 24);
    return () => {
      for (const polygon of drawn) polygon.setMap(null);
      listener.remove();
    };
    // The zones are the page's; a change reloads the page. The handlers
    // read the latest callbacks through their ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library]);

  // The pins, draggable; redrawn when they move.
  useEffect(() => {
    if (!map) return;
    const markers = pins.map((pin) => {
      const marker = new google.maps.Marker({
        position: toLatLng(pin.at),
        label: { text: pin.letter, color: "white", fontWeight: "600" },
        title: pin.letter === "A" ? "Pick-up (A)" : "Drop-off (B)",
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

  // The view's lines and dots, each saying what it is on hover.
  useEffect(() => {
    if (!map || !library) return;
    const emphasis = (layer: MapLayer) =>
      focus.length === 0
        ? "plain"
        : layer.key && focus.includes(layer.key)
          ? "lit"
          : "dim";
    const shapes = layers.map((layer) => {
      const shape =
        layer.kind === "line"
          ? new library.Polyline({
              path: layer.path.map(toLatLng),
              ...lineOptions(layer.style, emphasis(layer)),
              clickable: Boolean(layer.label),
              map,
              zIndex:
                layer.style === "route" ? 2 : emphasis(layer) === "lit" ? 5 : 4,
            })
          : new library.Circle({
              center: toLatLng(layer.at),
              radius: emphasis(layer) === "lit" ? 110 : 60,
              strokeColor: MAP_COLORS[layer.style],
              strokeWeight: 2,
              fillColor: MAP_COLORS[layer.style],
              fillOpacity:
                (layer.style === "target" ? 0.2 : 0.9) *
                (emphasis(layer) === "dim" ? 0.3 : 1),
              clickable: Boolean(layer.label),
              map,
              zIndex: 6,
            });
      if (layer.label) {
        const label = layer.label;
        shape.addListener("click", place);
        shape.addListener("mousemove", (event: google.maps.MapMouseEvent) =>
          hoverAt(label, event),
        );
        shape.addListener("mouseout", () => setHover(null));
      }
      return shape;
    });
    return () => {
      for (const shape of shapes) shape.setMap(null);
      setHover(null);
    };
    // See the zones' effect: the handlers read the latest callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library, layers, focus]);

  // A new answer: the view fitted to the pins and what is drawn.
  useEffect(() => {
    if (!map || frame === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const pin of pins) bounds.extend(toLatLng(pin.at));
    for (const layer of layers) {
      if (layer.kind === "dot") bounds.extend(toLatLng(layer.at));
      else for (const point of layer.path) bounds.extend(toLatLng(point));
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
    // Only a new frame moves the view; a pin dragged does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, frame]);

  return (
    <div className={cx("relative isolate", className)}>
      <div
        ref={host}
        role="application"
        aria-label="Map of the zones and the trip"
        className="size-full rounded-md border border-slate-200 bg-slate-100"
      />
      {hover ? (
        <div
          role="status"
          className="pointer-events-none absolute z-20 w-max max-w-72 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg"
          style={{ left: hover.x, top: hover.y - 12 }}
        >
          {hover.label}
        </div>
      ) : null}
      {failed ? (
        <p className="absolute inset-x-3 top-3 rounded-md bg-white p-3 text-sm text-red-700 shadow">
          {MAP_FAILURES[failed]}
        </p>
      ) : null}
    </div>
  );
}
