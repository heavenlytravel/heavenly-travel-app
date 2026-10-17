/// <reference types="google.maps" />

"use client";

import {
  isRing,
  ringsOf,
  type MultiPolygon,
  type Ring,
  type ZoneShape,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { useEffect, useRef, useState } from "react";
import { loadMapsLibrary, onKeyRefused } from "./google-maps";

/** A district's outline, for context under the zones. */
export type DistrictOutline = { name: string; polygons: MultiPolygon };

/** The districts of one state, as the zone maker offers them. */
export type DistrictChoice = {
  state: string;
  districts: { code: string; name: string }[];
};

/** Another zone of the location, drawn but not editable. */
export type OtherZone = { name: string; shape: ZoneShape };

const toLatLng = ([lng, lat]: [number, number]): google.maps.LatLngLiteral => ({
  lat,
  lng,
});

/** A Google path back to our ring, closed. */
function ringOf(path: google.maps.MVCArray<google.maps.LatLng>): Ring {
  const ring: Ring = path
    .getArray()
    .map((point: google.maps.LatLng) => [point.lng(), point.lat()]);
  if (ring.length > 0) ring.push(ring[0]!);
  return ring;
}

/** An open path for Google: our rings repeat the first corner at the end. */
function pathOf(ring: Ring): google.maps.LatLngLiteral[] {
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
function pathsOf(shape: ZoneShape): google.maps.LatLngLiteral[][] {
  return ringsOf(shape).map(pathOf);
}

const sameShape = (a: ZoneShape | null, b: ZoneShape | null) =>
  JSON.stringify(a) === JSON.stringify(b);

/** The fewest corners a drawn shape needs. */
const MIN_CORNERS = 3;

const DISTRICT_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#737373",
  strokeWeight: 1,
  fillColor: "#737373",
  fillOpacity: 0.06,
  clickable: false,
};
/** The other zones while one is being drawn: there, but not the point. */
const CONTEXT_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#0f86ce",
  strokeWeight: 1.5,
  fillColor: "#0f86ce",
  fillOpacity: 0.12,
  clickable: false,
};
/** The zones as the coverage: what is served, filled in. */
const COVERAGE_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#059669",
  strokeWeight: 1.5,
  fillColor: "#059669",
  fillOpacity: 0.25,
  clickable: false,
};
const ZONE_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#059669",
  strokeWeight: 2,
  fillColor: "#059669",
  fillOpacity: 0.2,
};
const DRAFT_STYLE: google.maps.PolylineOptions = {
  strokeColor: "#059669",
  strokeWeight: 2,
  clickable: false,
};

/** Why the map shows nothing useful, as the line under it says. */
const FAILURES = {
  load: "The map did not load. Check the browser key and the network.",
  refused:
    "Google refused the browser key. In its Google Cloud project, enable the Maps JavaScript API and allow it on the key, and allow this site's address among the key's referrers.",
} as const;

/**
 * The map of a location's zones: the districts of its states in grey and
 * the zones on them. As the coverage (`tone="coverage"`), every zone is
 * filled in green and nothing is edited. In the zone maker, the other
 * zones are blue context and the zone being edited is green: with
 * `editable` and no shape yet, each click on the map adds a corner to a
 * draft line, and "Finish shape" closes it into the zone; once there is a
 * ring, its corners can be dragged. Every change reports the ring.
 * Without `editable` the shape is only shown, as a circle's or a
 * district's preview is; a district's several pieces of land are drawn as
 * one zone.
 */
export function ZoneMap({
  mapKey,
  districts,
  others,
  tone = "context",
  shape,
  editable,
  onShapeChange,
}: {
  mapKey: string;
  districts: DistrictOutline[];
  others: OtherZone[];
  /** How the other zones are drawn: as context under the one edited, or as the coverage. */
  tone?: "context" | "coverage";
  shape: ZoneShape | null;
  /** Whether the shape may be drawn and dragged; only a ring can be. */
  editable: boolean;
  onShapeChange?: (ring: Ring) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const library = useRef<google.maps.MapsLibrary | null>(null);
  const polygon = useRef<google.maps.Polygon | null>(null);
  const draft = useRef<google.maps.Polyline | null>(null);
  const clickListener = useRef<google.maps.MapsEventListener | null>(null);
  const shown = useRef<ZoneShape | null>(null);
  const report = useRef(onShapeChange);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<keyof typeof FAILURES | null>(null);
  const [corners, setCorners] = useState(0);

  // Only a ring is dragged corner by corner; a district is shown as it is.
  const dragging = editable && shape !== null && isRing(shape);

  // The map's listeners outlive a render, so they read the latest callback here.
  useEffect(() => {
    report.current = onShapeChange;
  }, [onShapeChange]);

  // The map itself, once, with the districts and the other zones under it.
  useEffect(() => {
    let cancelled = false;
    const stopListening = onKeyRefused(() => {
      if (!cancelled) setFailed("refused");
    });
    loadMapsLibrary(mapKey)
      .then((loaded) => {
        if (cancelled || !host.current) return;
        library.current = loaded;
        const bounds = new google.maps.LatLngBounds();
        const created = new loaded.Map(host.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        map.current = created;
        for (const district of districts) {
          for (const polygonRings of district.polygons) {
            const outer = polygonRings[0];
            if (!outer) continue;
            new loaded.Polygon({
              ...DISTRICT_STYLE,
              paths: polygonRings.map(pathOf),
              map: created,
            });
            for (const point of outer) bounds.extend(toLatLng(point));
          }
        }
        for (const other of others) {
          new loaded.Polygon({
            ...(tone === "coverage" ? COVERAGE_STYLE : CONTEXT_STYLE),
            paths: pathsOf(other.shape),
            map: created,
          });
        }
        if (shape) {
          for (const ring of ringsOf(shape)) {
            for (const point of ring) bounds.extend(toLatLng(point));
          }
        }
        if (bounds.isEmpty()) {
          // Malaysia, when the location has no state drawn yet.
          created.setCenter({ lat: 4.2, lng: 108.0 });
          created.setZoom(6);
        } else {
          created.fitBounds(bounds, 24);
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed("load");
      });
    return () => {
      cancelled = true;
      stopListening();
    };
    // The districts and the other zones are the page's; they do not change
    // while the map is open, and the shape has its own effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey]);

  // The zone's own shape: drawn when it arrives, redrawn when it changes
  // elsewhere, and a draft line to click out while there is none and it
  // may be drawn.
  useEffect(() => {
    const loaded = library.current;
    const created = map.current;
    if (!ready || !loaded || !created) return;

    const listen = (target: google.maps.Polygon) => {
      const path = target.getPath();
      const changed = () => {
        const ring = ringOf(path);
        shown.current = ring;
        report.current?.(ring);
      };
      path.addListener("set_at", changed);
      path.addListener("insert_at", changed);
      path.addListener("remove_at", changed);
    };

    if (shape && !sameShape(shape, shown.current)) {
      const sameKind =
        shown.current !== null && isRing(shape) === isRing(shown.current);
      shown.current = shape;
      // A polygon that listened for drags keeps its listeners; a shape of
      // another kind gets a fresh polygon so a district is never dragged.
      if (polygon.current && sameKind) {
        polygon.current.setPaths(pathsOf(shape));
        polygon.current.setEditable(dragging);
      } else {
        polygon.current?.setMap(null);
        polygon.current = new loaded.Polygon({
          ...ZONE_STYLE,
          paths: pathsOf(shape),
          editable: dragging,
          map: created,
        });
        if (dragging) listen(polygon.current);
      }
      const bounds = new google.maps.LatLngBounds();
      for (const ring of ringsOf(shape)) {
        for (const point of ring) bounds.extend(toLatLng(point));
      }
      created.fitBounds(bounds, 48);
    } else if (!shape && polygon.current) {
      polygon.current.setMap(null);
      polygon.current = null;
      shown.current = null;
    } else if (polygon.current) {
      polygon.current.setEditable(dragging);
    }

    const wantsDraft = editable && !shape;
    if (wantsDraft && !draft.current) {
      const line = new loaded.Polyline({ ...DRAFT_STYLE, map: created });
      draft.current = line;
      clickListener.current = created.addListener(
        "click",
        (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          line.getPath().push(event.latLng);
          setCorners(line.getPath().getLength());
        },
      );
    } else if (!wantsDraft && draft.current) {
      draft.current.setMap(null);
      draft.current = null;
      clickListener.current?.remove();
      clickListener.current = null;
      setCorners(0);
    }
  }, [ready, shape, editable, dragging]);

  function undoCorner() {
    const line = draft.current;
    if (!line) return;
    const path = line.getPath();
    if (path.getLength() > 0) path.pop();
    setCorners(path.getLength());
  }

  function finishShape() {
    const line = draft.current;
    if (!line || line.getPath().getLength() < MIN_CORNERS) return;
    const ring = ringOf(line.getPath());
    // The shape effect draws the polygon from the reported ring.
    report.current?.(ring);
  }

  return (
    <div className="grid gap-2">
      <div
        ref={host}
        role="application"
        aria-label={
          tone === "coverage" ? "Map of the zones" : "Map of the zone"
        }
        className="h-96 w-full rounded-md border border-neutral-200 bg-neutral-100"
      />
      {failed ? (
        <p className="text-xs text-red-700">{FAILURES[failed]}</p>
      ) : editable && !shape ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-neutral-500">
            Click the map corner by corner, then finish the shape.{" "}
            {corners > 0 ? `${corners} corners so far.` : ""}
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={corners === 0}
            onClick={undoCorner}
          >
            Undo corner
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={corners < MIN_CORNERS}
            onClick={finishShape}
          >
            Finish shape
          </Button>
        </div>
      ) : dragging ? (
        <p className="text-xs text-neutral-500">
          Drag a corner to move it, or the midpoint of an edge to add one.
        </p>
      ) : null}
    </div>
  );
}
