/// <reference types="google.maps" />

"use client";

import { circleRing, type Ring, type ZoneShape } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MAP_FAILURES,
  boundsOf,
  layoutOf,
  pathOf,
  pathsOf,
  ringOfPath,
  sameShape,
  shapeOfRings,
  useGoogleMap,
  type DistrictOutline,
  type MukimChoice,
  type OtherZone,
} from "./map-shapes";

export type {
  DistrictChoice,
  DistrictOutline,
  MukimChoice,
  OtherZone,
} from "./map-shapes";

/** The fewest corners a piece of a shape keeps: a corner is not removed below it. */
const MIN_CORNERS = 3;

/** Corners of a circle placed on the map: round enough, and few enough to reshape by hand. */
const CIRCLE_CORNERS = 24;

/** How much of the view a new circle or square takes. */
const STARTER_SHARE = 0.25;

/** The other zones while one is being drawn: there, but not the point. */
const CONTEXT_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#0f86ce",
  strokeWeight: 1.5,
  fillColor: "#0f86ce",
  fillOpacity: 0.12,
  clickable: false,
};
/** Another location's zones: this one may not overlap them either. */
const OTHER_LOCATION_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#d97706",
  strokeWeight: 1.5,
  fillColor: "#d97706",
  fillOpacity: 0.12,
  clickable: false,
};
const ZONE_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#059669",
  strokeWeight: 2,
  fillColor: "#059669",
  fillOpacity: 0.22,
  zIndex: 1,
};
/** The district's mukims over the zone, each a click to tick or untick. */
const MUKIM_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#404040",
  strokeWeight: 1,
  strokeOpacity: 0.7,
  fillColor: "#404040",
  fillOpacity: 0,
  zIndex: 2,
};
const MUKIM_HOVER_OPACITY = 0.14;

/** What a hand on the map does: reshape the zone with the map held still, or move the map. */
type Tool = "edit" | "pan";

/** The view's centre and a length that fits well in it, in metres. */
function viewOf(map: google.maps.Map) {
  const center = map.getCenter();
  const bounds = map.getBounds();
  if (!center || !bounds) return null;
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const metresPerDegree = 111_320;
  const tall = (ne.lat() - sw.lat()) * metresPerDegree;
  const wide =
    (ne.lng() - sw.lng()) *
    metresPerDegree *
    Math.cos((center.lat() * Math.PI) / 180);
  return {
    center: { lat: center.lat(), lng: center.lng() },
    size: Math.min(tall, wide) * STARTER_SHARE,
  };
}

/** A square of `size` metres a side around a point, as a closed ring. */
function squareRing(center: { lat: number; lng: number }, size: number): Ring {
  const half = size / 2 / 111_320;
  const halfLng = half / Math.cos((center.lat * Math.PI) / 180);
  const corners: Ring = [
    [center.lng - halfLng, center.lat - half],
    [center.lng + halfLng, center.lat - half],
    [center.lng + halfLng, center.lat + half],
    [center.lng - halfLng, center.lat + half],
  ];
  return [...corners, corners[0]!];
}

/**
 * The zone maker's map: the districts of the location's states in grey,
 * its other zones in blue, other locations' zones in amber, and the zone
 * being made in green. With `mukims`, the district's mukims are outlined
 * over it, and a click on one ticks or unticks it. A shape that
 * may be reshaped has two tools. "Edit shape" holds the map still so a
 * drag never pans it: drag a corner to move it, the small mark halfway
 * along an edge to add a corner there, or the inside to move the whole
 * zone; right-click a corner to remove it. "Move map" pans and zooms with
 * the shape left alone. With `starters`, "Circle" and "Square" put a new
 * shape in the middle of the view, to reshape from there; no corner is
 * clicked out by hand. Every change reports the whole shape, a district's
 * several pieces of land included.
 */
export function ZoneMap({
  mapKey,
  districts,
  others,
  shape,
  editable,
  starters,
  canUndo,
  onUndo,
  onShapeChange,
  mukims,
  onToggleMukim,
}: {
  mapKey: string;
  districts: DistrictOutline[];
  others: OtherZone[];
  shape: ZoneShape | null;
  /** Whether the shape may be reshaped: not while it is a district as it is. */
  editable: boolean;
  /** Whether to offer a new circle or square in the view. */
  starters: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onShapeChange: (shape: ZoneShape) => void;
  /** The district's mukims to outline over the zone; none while it is not made of them. */
  mukims?: MukimChoice[];
  onToggleMukim?: (code: string) => void;
}) {
  const { host, map, library, failed } = useGoogleMap(mapKey, districts);
  const polygon = useRef<google.maps.Polygon | null>(null);
  // The shape on the map, as last drawn or reported, to tell an edit made
  // here from a shape handed in.
  const shown = useRef<ZoneShape | null>(null);
  const report = useRef(onShapeChange);
  const toggle = useRef(onToggleMukim);
  const [tool, setTool] = useState<Tool>("edit");
  const [hovered, setHovered] = useState<MukimChoice | null>(null);
  const reshaping = editable && shape !== null && tool === "edit";

  // The map's listeners outlive a render, so they read the latest callbacks here.
  useEffect(() => {
    report.current = onShapeChange;
    toggle.current = onToggleMukim;
  }, [onShapeChange, onToggleMukim]);

  // Once the map is there: the other zones, and the view on the shape.
  useEffect(() => {
    if (!map || !library) return;
    for (const other of others) {
      new library.Polygon({
        ...(other.location ? OTHER_LOCATION_STYLE : CONTEXT_STYLE),
        paths: pathsOf(other.shape),
        map,
      });
    }
    // The zone itself, else the location's other zones, where the work is,
    // else its states.
    const own = others.filter((other) => !other.location);
    const bounds = boundsOf(
      shape
        ? [shape]
        : own.length > 0
          ? own.map((other) => other.shape)
          : districts.map((district) => district.polygons),
    );
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
    // The other zones and the districts are the page's, drawn once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library]);

  // The zone itself: drawn afresh when a shape is handed in (a district, a
  // circle around a place, a starter, an undo), left alone when the change
  // came from a hand on the map.
  useEffect(() => {
    if (!map || !library) return;
    if (sameShape(shape, shown.current)) return;
    polygon.current?.setMap(null);
    polygon.current = null;
    shown.current = shape;
    if (!shape) return;

    const layout = layoutOf(shape);
    const drawn = new library.Polygon({
      ...ZONE_STYLE,
      paths: pathsOf(shape),
      map,
    });
    polygon.current = drawn;

    let dragging = false;
    let frame = 0;
    const send = () => {
      if (dragging) return;
      const rings = drawn
        .getPaths()
        .getArray()
        .map((path) => ringOfPath(path));
      const next = shapeOfRings(rings, layout);
      shown.current = next;
      report.current(next);
    };
    // A drag fires one event per corner it moves; one report a frame is enough.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        send();
      });
    };
    for (const path of drawn.getPaths().getArray()) {
      path.addListener("set_at", schedule);
      path.addListener("insert_at", schedule);
      path.addListener("remove_at", schedule);
    }
    drawn.addListener("dragstart", () => {
      dragging = true;
    });
    drawn.addListener("dragend", () => {
      dragging = false;
      send();
    });
    drawn.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
      if (event.path === undefined || event.vertex === undefined) return;
      const path = drawn.getPaths().getAt(event.path);
      if (path.getLength() > MIN_CORNERS) path.removeAt(event.vertex);
    });

    // A shape out of view is brought into it; one in view stays where it is.
    const view = map.getBounds();
    const bounds = boundsOf([shape]);
    if (
      !view ||
      !view.contains(bounds.getNorthEast()) ||
      !view.contains(bounds.getSouthWest())
    ) {
      map.fitBounds(bounds, 48);
    }
  }, [map, library, shape]);

  // The district's mukims over the zone, drawn afresh when the list changes.
  const mukimKey = mukims?.map((mukim) => mukim.code).join(" ") ?? "";
  useEffect(() => {
    if (!map || !library || !mukims) return;
    const outlines = mukims.map((mukim) => {
      const outline = new library.Polygon({
        ...MUKIM_STYLE,
        paths: mukim.polygons.flat().map(pathOf),
        map,
      });
      outline.addListener("click", () => toggle.current?.(mukim.code));
      outline.addListener("mouseover", () => {
        outline.setOptions({ fillOpacity: MUKIM_HOVER_OPACITY });
        setHovered(mukim);
      });
      outline.addListener("mouseout", () => {
        outline.setOptions({ fillOpacity: 0 });
        setHovered((was) => (was === mukim ? null : was));
      });
      return outline;
    });
    return () => {
      for (const outline of outlines) outline.setMap(null);
      setHovered(null);
    };
    // The list is redrawn when its mukims change, not when a new array holds the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library, mukimKey]);

  // The tool in hand: the map held still while reshaping, free otherwise.
  useEffect(() => {
    polygon.current?.setOptions({ editable: reshaping, draggable: reshaping });
    map?.setOptions({ gestureHandling: reshaping ? "none" : "auto" });
  }, [map, reshaping, shape]);

  function place(kind: "circle" | "square") {
    if (!map) return;
    const view = viewOf(map);
    if (!view) return;
    setTool("edit");
    report.current(
      kind === "circle"
        ? circleRing(view.center, view.size / 2, CIRCLE_CORNERS)
        : squareRing(view.center, view.size),
    );
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <div
          ref={host}
          role="application"
          aria-label="Map of the zone"
          className="h-[28rem] w-full rounded-md border border-neutral-200 bg-neutral-100"
        />
        {map ? (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-2">
            {editable && shape ? (
              <ToolGroup>
                <ToolButton
                  active={tool === "edit"}
                  onClick={() => setTool("edit")}
                >
                  Edit shape
                </ToolButton>
                <ToolButton
                  active={tool === "pan"}
                  onClick={() => setTool("pan")}
                >
                  Move map
                </ToolButton>
              </ToolGroup>
            ) : null}
            {starters ? (
              <ToolGroup>
                <ToolButton onClick={() => place("circle")}>Circle</ToolButton>
                <ToolButton onClick={() => place("square")}>Square</ToolButton>
              </ToolGroup>
            ) : null}
            {canUndo ? (
              <ToolGroup>
                <ToolButton onClick={onUndo}>Undo</ToolButton>
              </ToolGroup>
            ) : null}
          </div>
        ) : null}
      </div>
      <p
        className={cx("text-xs", failed ? "text-red-700" : "text-neutral-500")}
      >
        {failed
          ? MAP_FAILURES[failed]
          : mukims
            ? hovered
              ? `${hovered.name}, ${hovered.kind.toLowerCase()}: click to tick or untick it.`
              : "Click a mukim on the map to tick or untick it."
            : !shape
              ? starters
                ? "Move the map to the area, then put a circle or a square on it to reshape."
                : null
              : !editable
                ? null
                : reshaping
                  ? "The map is held still. Drag a corner to move it, the mark halfway along an edge to add one, or the inside to move the whole zone. Right-click a corner to remove it. Zoom with the control at the bottom right."
                  : "Drag to move the map and scroll to zoom. Switch to Edit shape to reshape the zone."}
      </p>
    </div>
  );
}

function ToolGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      {children}
    </div>
  );
}

function ToolButton({
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "h-8 px-3 text-xs font-medium transition-colors focus-visible:relative focus-visible:outline-2 focus-visible:outline-neutral-900 [&+&]:border-l [&+&]:border-neutral-200",
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-700 hover:bg-neutral-100",
      )}
    >
      {children}
    </button>
  );
}
