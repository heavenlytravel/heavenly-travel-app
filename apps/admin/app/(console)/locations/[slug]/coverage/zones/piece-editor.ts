/// <reference types="google.maps" />

import type { LngLat, MultiPolygon } from "@repo/db";
import { openRing as open, pathOf } from "./map-shapes";

/**
 * The zone maker's hands on the map: the zone's pieces of land, each its
 * own polygon, and the corners of the one selected. Google's own polygon
 * editing puts a handle on every corner of every piece and another halfway
 * along every edge, and drags the whole shape; on a coastline of 37
 * islands and 800 corners that is unworkable. Here a click selects a piece
 * and only its corners show. A drag moves a corner, or the piece alone. A
 * right-click removes a corner, adds one on an edge, or deletes a piece.
 * The map still pans and zooms around them. Every gesture reports the
 * whole shape once, when it ends, so each is one step of Undo. Browser
 * only.
 */

/** A piece as it is edited: its rings open, the first corner not repeated at the end. */
type OpenPiece = LngLat[][];

export type PieceEditorOptions = {
  map: google.maps.Map;
  library: google.maps.MapsLibrary;
  style: google.maps.PolygonOptions;
  selectedStyle: google.maps.PolygonOptions;
  /** The pieces after a gesture, each ring closed. */
  onChange: (pieces: MultiPolygon) => void;
  onSelect: (index: number | null) => void;
  /** Why a gesture did nothing, in a sentence. */
  onRefuse: (message: string) => void;
};

export type PieceEditor = {
  /** Draws the pieces handed in: a new shape, or one undone. */
  setPieces: (pieces: MultiPolygon) => void;
  /** Whether a hand may change them; when not, they are only drawn. */
  setEditable: (editable: boolean) => void;
  select: (index: number | null) => void;
  /** A new piece, selected, added after the others. */
  addPiece: (ring: LngLat[]) => void;
  /** Deletes the piece selected, unless it is the last. */
  deleteSelected: () => void;
  destroy: () => void;
};

/** Corners a ring keeps at least. */
const MIN_CORNERS = 3;
/** How near a right-click must be to an edge, in pixels, to add a corner there. */
const EDGE_PX = 8;
const CORNER_RADIUS = 5;
/**
 * Corners nearer the last one drawn than this, in pixels, are not drawn:
 * zoomed out, a coastline of corners is a blob; zoomed in, every one shows.
 */
const CORNER_GAP = 12;
/** Room around the piece for its corners and its edges' reach. */
const PAD = CORNER_RADIUS + EDGE_PX;
const SVG_NS = "http://www.w3.org/2000/svg";

const closed = (ring: LngLat[]): LngLat[] =>
  ring.length > 0 ? [...ring, ring[0]!] : ring;
const latLngOf = ([lng, lat]: LngLat) => new google.maps.LatLng(lat, lng);

/** How far p is from segment a-b, in pixels. */
function pixelsToSegment(
  p: google.maps.Point,
  a: google.maps.Point,
  b: google.maps.Point,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2),
        );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function createPieceEditor(options: PieceEditorOptions): PieceEditor {
  const { map, library, style, selectedStyle } = options;
  let pieces: OpenPiece[] = [];
  let polygons: google.maps.Polygon[] = [];
  let selected: number | null = null;
  let editable = false;
  let frame = 0;

  // The selected piece's corners and its body, over the map: an SVG in the
  // pane that takes the mouse, positioned on every redraw.
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.style.position = "absolute";
  svg.style.display = "none";
  const group = document.createElementNS(SVG_NS, "g");
  const body = document.createElementNS(SVG_NS, "path");
  body.setAttribute("fill", "#000");
  body.setAttribute("fill-opacity", "0");
  body.setAttribute("fill-rule", "evenodd");
  body.setAttribute("stroke", "#000");
  body.setAttribute("stroke-opacity", "0");
  body.setAttribute("stroke-width", String(EDGE_PX * 2));
  body.style.cursor = "move";
  group.appendChild(body);
  const corners = document.createElementNS(SVG_NS, "g");
  group.appendChild(corners);
  svg.appendChild(group);

  const overlay = new library.OverlayView();
  overlay.onAdd = () => {
    overlay.getPanes()?.overlayMouseTarget.appendChild(svg);
  };
  overlay.onRemove = () => svg.remove();
  overlay.draw = () => drawHandles();
  overlay.setMap(map);

  const projection = () => overlay.getProjection();

  function report() {
    options.onChange(pieces.map((piece) => piece.map(closed)));
  }

  function select(index: number | null) {
    const next = index !== null && index < pieces.length ? index : null;
    if (next === selected) return;
    const was = selected;
    selected = next;
    if (was !== null) polygons[was]?.setOptions(style);
    if (next !== null) polygons[next]?.setOptions(selectedStyle);
    drawHandles();
    options.onSelect(next);
  }

  function drawPolygons() {
    for (const polygon of polygons) polygon.setMap(null);
    polygons = pieces.map((piece, index) => {
      const polygon = new library.Polygon({
        ...(index === selected ? selectedStyle : style),
        paths: piece.map(pathOf),
        clickable: editable,
        map,
      });
      polygon.addListener("click", () => {
        if (editable) select(index);
      });
      polygon.addListener("rightclick", () => {
        if (editable) deletePiece(index);
      });
      return polygon;
    });
  }

  /** Redraws one piece while a hand moves it, once a frame. */
  function redrawLive(index: number) {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      polygons[index]?.setPaths(pieces[index]!.map(pathOf));
      drawHandles();
    });
  }

  function drawHandles() {
    const proj = projection();
    const piece = selected === null ? undefined : pieces[selected];
    if (!editable || !proj || !piece) {
      svg.style.display = "none";
      return;
    }
    const rings = piece.map((ring) =>
      ring.map((corner) => proj.fromLatLngToDivPixel(latLngOf(corner))!),
    );
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ring of rings) {
      for (const p of ring) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    // The SVG covers the piece and a margin, so its own numbers stay small.
    minX -= PAD;
    minY -= PAD;
    svg.style.display = "block";
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.setAttribute("width", String(maxX + PAD - minX));
    svg.setAttribute("height", String(maxY + PAD - minY));
    body.setAttribute(
      "d",
      rings
        .map(
          (ring) =>
            `M${ring.map((p) => `${p.x - minX},${p.y - minY}`).join("L")}Z`,
        )
        .join(""),
    );
    const near = (a: google.maps.Point, b: google.maps.Point) =>
      Math.hypot(a.x - b.x, a.y - b.y) < CORNER_GAP;
    const shown = rings.map((ring) => {
      const kept: { p: google.maps.Point; i: number }[] = [];
      for (const [i, p] of ring.entries()) {
        const last = kept.at(-1);
        if (!last || !near(p, last.p)) kept.push({ p, i });
      }
      // The ring closes: its last corner drawn is next to its first.
      if (kept.length > 1 && near(kept.at(-1)!.p, kept[0]!.p)) kept.pop();
      return kept;
    });
    const wanted = shown.reduce((n, ring) => n + ring.length, 0);
    while (corners.childNodes.length > wanted) corners.lastChild!.remove();
    while (corners.childNodes.length < wanted) {
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("r", String(CORNER_RADIUS));
      dot.setAttribute("fill", "#fff");
      dot.setAttribute("stroke", "#047857");
      dot.setAttribute("stroke-width", "2");
      dot.style.cursor = "grab";
      corners.appendChild(dot);
    }
    let at = 0;
    shown.forEach((ring, r) => {
      ring.forEach(({ p, i }) => {
        const dot = corners.childNodes[at++] as SVGCircleElement;
        dot.setAttribute("cx", String(p.x - minX));
        dot.setAttribute("cy", String(p.y - minY));
        dot.dataset.ring = String(r);
        dot.dataset.corner = String(i);
      });
    });
  }

  /** The map's point under the pointer, as a corner. */
  function cornerAt(event: MouseEvent): LngLat | null {
    const proj = projection();
    if (!proj) return null;
    const box = map.getDiv().getBoundingClientRect();
    const at = proj.fromContainerPixelToLatLng(
      new google.maps.Point(event.clientX - box.left, event.clientY - box.top),
    );
    return at ? [at.lng(), at.lat()] : null;
  }

  function deletePiece(index: number) {
    if (pieces.length <= 1) {
      options.onRefuse(
        "A zone keeps at least one piece. Remove the zone itself on the Coverage tab.",
      );
      return;
    }
    pieces = pieces.filter((_, i) => i !== index);
    // Another piece keeps its selection, one place along if it came after.
    const was = selected;
    selected =
      was === null || was === index ? null : was > index ? was - 1 : was;
    drawPolygons();
    drawHandles();
    if (selected !== was) options.onSelect(selected);
    report();
  }

  // While a hand is on a corner or a piece the map holds still; around
  // them it pans and zooms as ever.
  let drag:
    | { kind: "corner"; ring: number; corner: number; moved: boolean }
    | {
        kind: "piece";
        from: LngLat;
        original: OpenPiece;
        moved: boolean;
      }
    | null = null;
  let gestures: google.maps.MapOptions["gestureHandling"] = "auto";

  const stop = (event: Event) => event.stopPropagation();
  for (const type of ["mousedown", "click", "dblclick", "touchstart"]) {
    svg.addEventListener(type, stop);
  }

  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || selected === null) return;
    event.stopPropagation();
    event.preventDefault();
    const target = event.target as SVGElement;
    const from = cornerAt(event);
    if (!from) return;
    gestures = map.get("gestureHandling") ?? "auto";
    map.setOptions({ gestureHandling: "none" });
    try {
      svg.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks cannot be captured; the
      // drag still follows it while it stays over the piece.
    }
    drag =
      target.dataset.corner !== undefined
        ? {
            kind: "corner",
            ring: Number(target.dataset.ring),
            corner: Number(target.dataset.corner),
            moved: false,
          }
        : {
            kind: "piece",
            from,
            original: pieces[selected]!.map((ring) => [...ring]),
            moved: false,
          };
  });

  svg.addEventListener("pointermove", (event) => {
    if (!drag || selected === null) return;
    const at = cornerAt(event);
    if (!at) return;
    const piece = pieces[selected]!;
    if (drag.kind === "corner") {
      piece[drag.ring]![drag.corner] = at;
    } else {
      const dLng = at[0] - drag.from[0];
      const dLat = at[1] - drag.from[1];
      pieces[selected] = drag.original.map((ring) =>
        ring.map(([lng, lat]): LngLat => [lng + dLng, lat + dLat]),
      );
    }
    drag.moved = true;
    redrawLive(selected);
  });

  function endDrag() {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    map.setOptions({ gestureHandling: gestures });
    if (moved) report();
  }
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  svg.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const proj = projection();
    if (selected === null || !proj) return;
    const piece = pieces[selected]!;
    const target = event.target as SVGElement;

    if (target.dataset.corner !== undefined) {
      const ring = piece[Number(target.dataset.ring)]!;
      if (ring.length <= MIN_CORNERS) {
        options.onRefuse("A piece keeps at least three corners.");
        return;
      }
      ring.splice(Number(target.dataset.corner), 1);
      polygons[selected]?.setPaths(piece.map(pathOf));
      drawHandles();
      report();
      return;
    }

    // On an edge, a corner there; inside, the piece goes.
    const at = cornerAt(event);
    if (!at) return;
    const p = proj.fromLatLngToDivPixel(latLngOf(at))!;
    let edge: { ring: number; after: number; distance: number } | null = null;
    for (const [r, ring] of piece.entries()) {
      for (const [i, corner] of ring.entries()) {
        const next = ring[(i + 1) % ring.length]!;
        const distance = pixelsToSegment(
          p,
          proj.fromLatLngToDivPixel(latLngOf(corner))!,
          proj.fromLatLngToDivPixel(latLngOf(next))!,
        );
        if (!edge || distance < edge.distance) {
          edge = { ring: r, after: i, distance };
        }
      }
    }
    if (edge && edge.distance <= EDGE_PX) {
      piece[edge.ring]!.splice(edge.after + 1, 0, at);
      polygons[selected]?.setPaths(piece.map(pathOf));
      drawHandles();
      report();
      return;
    }
    deletePiece(selected);
  });

  const mapClick = map.addListener("click", () => select(null));

  return {
    setPieces(next) {
      // A selection stays on a shape of as many pieces, an undone corner or
      // move; with pieces added or gone, it could name another one.
      const same = next.length === pieces.length;
      pieces = next.map((piece) => piece.map(open));
      if (selected !== null && !same) {
        selected = null;
        options.onSelect(null);
      }
      drawPolygons();
      drawHandles();
    },
    setEditable(next) {
      if (next === editable) return;
      editable = next;
      for (const polygon of polygons) polygon.setOptions({ clickable: next });
      drawHandles();
    },
    select,
    addPiece(ring) {
      pieces = [...pieces, [open(ring)]];
      selected = pieces.length - 1;
      drawPolygons();
      drawHandles();
      options.onSelect(selected);
      report();
    },
    deleteSelected() {
      if (selected !== null) deletePiece(selected);
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      mapClick.remove();
      for (const polygon of polygons) polygon.setMap(null);
      overlay.setMap(null);
    },
  };
}
