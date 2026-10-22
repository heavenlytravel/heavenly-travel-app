/// <reference types="google.maps" />

"use client";

import type { ZoneShape } from "@repo/db";
import { useEffect, useRef, useState } from "react";
import {
  MAP_FAILURES,
  boundsOf,
  pathsOf,
  useGoogleMap,
  type DistrictOutline,
} from "./zones/map-shapes";

/** A zone as the coverage map draws it: its shape in its colour, its name and one line about it on hover. */
export type MappedZone = {
  id: string;
  name: string;
  shape: ZoneShape;
  color: string;
  /** "A circle of 1.5 km around Langkawi Airport · 2 priced routes" */
  note: string;
};

/** How a zone is drawn: the one pointed at, on the map or in the list, stands out. */
function styleOf(zone: MappedZone, highlighted: string | null) {
  const lit = zone.id === highlighted;
  const dimmed = highlighted !== null && !lit;
  return {
    strokeColor: zone.color,
    strokeWeight: lit ? 3 : 1.5,
    strokeOpacity: dimmed ? 0.5 : 1,
    fillColor: zone.color,
    fillOpacity: lit ? 0.45 : dimmed ? 0.12 : 0.25,
    zIndex: lit ? 2 : 1,
  } satisfies google.maps.PolygonOptions;
}

/**
 * The coverage as a map: the districts of the location's states in grey
 * and every zone in its own colour, framed on the zones. Pointing at a
 * zone names it beside the pointer and lights it and its row in the list;
 * pointing at a row lights the zone; a click opens its editor. The list
 * owns which zone is lit, so the two stay one.
 */
export function CoverageMap({
  mapKey,
  districts,
  zones,
  highlighted,
  onHighlight,
  onOpen,
}: {
  mapKey: string;
  districts: DistrictOutline[];
  zones: MappedZone[];
  highlighted: string | null;
  onHighlight: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const { host, map, library, failed } = useGoogleMap(mapKey, districts);
  const polygons = useRef(new Map<string, google.maps.Polygon>());
  const callbacks = useRef({ onHighlight, onOpen });
  // The zone under the pointer and where the pointer is; `flip` puts the
  // label on the pointer's left near the map's right edge.
  const [label, setLabel] = useState<{
    id: string;
    x: number;
    y: number;
    flip: boolean;
  } | null>(null);

  useEffect(() => {
    callbacks.current = { onHighlight, onOpen };
  }, [onHighlight, onOpen]);

  // The zones, once the map is there, framed on them.
  useEffect(() => {
    if (!map || !library) return;
    const drawn = polygons.current;
    for (const zone of zones) {
      const polygon = new library.Polygon({
        ...styleOf(zone, null),
        paths: pathsOf(zone.shape),
        map,
      });
      const at = (event: google.maps.PolyMouseEvent) => {
        const box = host.current?.getBoundingClientRect();
        const pointer = event.domEvent as MouseEvent | undefined;
        if (!box || !pointer || !("clientX" in pointer)) return;
        const x = pointer.clientX - box.left;
        setLabel({
          id: zone.id,
          x,
          y: pointer.clientY - box.top,
          flip: x > box.width - 280,
        });
      };
      polygon.addListener("mouseover", (event: google.maps.PolyMouseEvent) => {
        callbacks.current.onHighlight(zone.id);
        at(event);
      });
      polygon.addListener("mousemove", at);
      polygon.addListener("mouseout", () => {
        callbacks.current.onHighlight(null);
        setLabel(null);
      });
      polygon.addListener("click", () => callbacks.current.onOpen(zone.id));
      drawn.set(zone.id, polygon);
    }
    const bounds = boundsOf(
      zones.length > 0
        ? zones.map((zone) => zone.shape)
        : districts.map((district) => district.polygons),
    );
    if (!bounds.isEmpty()) map.fitBounds(bounds, 32);
    return () => {
      for (const polygon of drawn.values()) polygon.setMap(null);
      drawn.clear();
    };
    // The zones and districts are the page's; a change reloads the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library]);

  // The zone pointed at, here or in the list, stands out.
  useEffect(() => {
    for (const zone of zones) {
      polygons.current.get(zone.id)?.setOptions(styleOf(zone, highlighted));
    }
  }, [zones, highlighted]);

  const labelled = label ? zones.find((zone) => zone.id === label.id) : null;

  return (
    <div className="grid gap-2">
      {/* Isolated: the map's layers and its label stay under the console's
          sticky header on a scroll. */}
      <div className="relative isolate">
        <div
          ref={host}
          role="application"
          aria-label="Map of the zones"
          className="h-96 w-full rounded-md border border-slate-200 bg-slate-100"
        />
        {label && labelled ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 w-max max-w-64 rounded-md bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{
              top: label.y + 14,
              ...(label.flip
                ? { right: `calc(100% - ${label.x - 10}px)` }
                : { left: label.x + 14 }),
            }}
          >
            <span className="block font-medium">{labelled.name}</span>
            <span className="block text-slate-300">{labelled.note}</span>
          </div>
        ) : null}
      </div>
      {failed ? (
        <p className="text-xs text-red-700">{MAP_FAILURES[failed]}</p>
      ) : null}
    </div>
  );
}
