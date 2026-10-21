/// <reference types="google.maps" />

import { cutPolygonBetween, type LngLat, type MultiPolygon } from "@repo/db";
import { openRing as open, pathOf } from "./map-shapes";

/**
 * The zone maker's hands on the map: the zone's pieces of land, each its
 * own polygon, and the corners of the one selected. Google's own polygon
 * editing puts a handle on every corner of every piece and another halfway
 * along every edge, and drags the whole shape; on a coastline of 37
 * islands and 800 corners that is unworkable. Here everything is a plain
 * click, so a trackpad needs no right-click:
 *
 * - a click selects a piece and only its corners show; a click on a corner
 *   selects it;
 * - a drag on a corner moves it, a drag inside the piece moves the piece
 *   alone, and a drag anywhere else moves the map;
 * - pointing at an edge shows one "+" on it, under the pointer: a click
 *   adds a corner there, a drag adds and moves it;
 * - the toolbar, or Delete and Backspace, removes the corner selected, or
 *   the piece; its scissors cut the piece from the corner selected to
 *   another one clicked, along the straight line between them; Esc stops.
 *
 * A right-click opens a menu of the same choices, as a shortcut. Every
 * change reports the whole shape once, when it is done, so each is one
 * step of Undo. Browser only.
 */

/** A piece as it is edited: its rings open, the first corner not repeated at the end. */
type OpenPiece = LngLat[][];

/** A corner of the piece selected, by its ring and its place in it. */
type CornerAt = { ring: number; corner: number };

/** One choice of the right-click menu. */
export type PieceMenuItem = {
  label: string;
  /** A choice that takes something away. */
  danger?: boolean;
  run: () => void;
};

/**
 * The right-click menu, at a point of `within` in pixels: the element the
 * map is on screen in, where the menu goes to be seen, in full screen too.
 */
export type PieceMenu = {
  x: number;
  y: number;
  items: PieceMenuItem[];
  within: HTMLElement;
};

/** What is selected: a piece, and maybe one of its corners. */
export type PieceSelection = { piece: number; corner: boolean } | null;

export type PieceEditorOptions = {
  map: google.maps.Map;
  library: google.maps.MapsLibrary;
  style: google.maps.PolygonOptions;
  selectedStyle: google.maps.PolygonOptions;
  /** The pieces after a change, each ring closed. */
  onChange: (pieces: MultiPolygon) => void;
  onSelect: (selection: PieceSelection) => void;
  /** Whether a cut is waiting for its second corner. */
  onCutting: (cutting: boolean) => void;
  /** A sentence for under the map: why a choice did nothing, or what to do next. */
  onNotice: (message: string, kind: "refused" | "done") => void;
  /** Opens the right-click menu, or closes it with null. */
  onMenu: (menu: PieceMenu | null) => void;
};

export type PieceEditor = {
  /** Draws the pieces handed in: a new shape, or one undone. */
  setPieces: (pieces: MultiPolygon) => void;
  /** Whether a hand may change them; when not, they are only drawn. */
  setEditable: (editable: boolean) => void;
  /** A new piece, selected, added after the others. */
  addPiece: (ring: LngLat[]) => void;
  /** Removes the corner selected, else deletes the piece selected. */
  removeSelected: () => void;
  /** Starts a cut from the corner selected. */
  startCut: () => void;
  destroy: () => void;
};

/** Corners a ring keeps at least. */
const MIN_CORNERS = 3;
/** How near the pointer must be to an edge, in pixels, for the "+" to show on it. */
const EDGE_PX = 8;
/** The same for the right-click menu, which asks before it acts. */
const MENU_EDGE_PX = 12;
const CORNER_RADIUS = 5;
/**
 * Corners nearer the last one drawn than this, in pixels, are not drawn:
 * zoomed out, a coastline of corners is a blob; zoomed in, every one shows.
 * The corner selected and one just added always show.
 */
const CORNER_GAP = 8;
/** Room around the piece for its corners and the "+". */
const PAD = CORNER_RADIUS + EDGE_PX;
/** The menu's size, near enough, to keep it inside the map. */
const MENU_WIDTH = 200;
const MENU_ITEM_HEIGHT = 36;
const SVG_NS = "http://www.w3.org/2000/svg";
const GREEN = "#047857";

/** The ring closed, its last corner a copy of the first, not the same array. */
const closed = (ring: LngLat[]): LngLat[] =>
  ring.length > 0 ? [...ring, [ring[0]![0], ring[0]![1]]] : ring;
const latLngOf = ([lng, lat]: LngLat) => new google.maps.LatLng(lat, lng);
const sameCorner = (a: CornerAt | null, b: CornerAt | null) =>
  a !== null && b !== null && a.ring === b.ring && a.corner === b.corner;

/** The point of segment a-b nearest p, and how far it is, in pixels. */
function nearestOnSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
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
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return { x, y, distance: Math.hypot(p.x - x, p.y - y) };
}

/**
 * The element the map is on screen in: its own box, or in full screen the
 * element inside it that Google shows, the box staying where it was on the
 * page.
 */
function onScreen(map: google.maps.Map): HTMLElement {
  const box = map.getDiv();
  const full = document.fullscreenElement;
  return full instanceof HTMLElement && box.contains(full) ? full : box;
}

/** Whether a key press belongs to a field being typed in, not the map. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function createPieceEditor(options: PieceEditorOptions): PieceEditor {
  const { map, library, style, selectedStyle } = options;
  let pieces: OpenPiece[] = [];
  let polygons: google.maps.Polygon[] = [];
  let selected: number | null = null;
  // The corner selected, the one just added, and the first of a cut.
  let corner: CornerAt | null = null;
  let added: CornerAt | null = null;
  let cutFrom: CornerAt | null = null;
  // The selected piece's corners in the pane's pixels, and where its SVG sits.
  let pixels: { x: number; y: number }[][] = [];
  let origin = { x: 0, y: 0 };
  let editable = false;
  let frame = 0;
  // The click that ends a cut lands on a part it made; it is not a pick.
  let ignoreClickUntil = 0;
  const clickIgnored = () => performance.now() < ignoreClickUntil;

  // The selected piece's body, its corners, the "+" and the cut's line,
  // over the map: an SVG in the pane, positioned on every redraw. Only the
  // body, the corners and the "+" take the mouse; the rest of the SVG's box
  // lets it through to the map.
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.style.position = "absolute";
  svg.style.display = "none";
  svg.style.pointerEvents = "none";
  const group = document.createElementNS(SVG_NS, "g");
  const body = document.createElementNS(SVG_NS, "path");
  body.setAttribute("fill", "#000");
  body.setAttribute("fill-opacity", "0");
  body.setAttribute("fill-rule", "evenodd");
  body.style.pointerEvents = "visiblePainted";
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("stroke", GREEN);
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", "6 4");
  line.style.pointerEvents = "none";
  line.style.display = "none";
  const corners = document.createElementNS(SVG_NS, "g");
  corners.style.pointerEvents = "visiblePainted";
  const plus = document.createElementNS(SVG_NS, "g");
  plus.style.pointerEvents = "visiblePainted";
  plus.style.cursor = "copy";
  plus.style.display = "none";
  const plusDot = document.createElementNS(SVG_NS, "circle");
  plusDot.setAttribute("r", "7");
  plusDot.setAttribute("fill", "#fff");
  plusDot.setAttribute("stroke", GREEN);
  plusDot.setAttribute("stroke-width", "2");
  const plusSign = document.createElementNS(SVG_NS, "path");
  plusSign.setAttribute("d", "M-3.5,0H3.5M0,-3.5V3.5");
  plusSign.setAttribute("stroke", GREEN);
  plusSign.setAttribute("stroke-width", "2");
  plusSign.style.pointerEvents = "none";
  plus.append(plusDot, plusSign);
  group.append(body, line, corners, plus);
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

  function announce() {
    options.onSelect(
      selected === null ? null : { piece: selected, corner: corner !== null },
    );
  }

  function stopCut() {
    if (!cutFrom) return;
    cutFrom = null;
    line.style.display = "none";
    options.onCutting(false);
  }

  function select(index: number | null) {
    const next = index !== null && index < pieces.length ? index : null;
    if (next === selected) return;
    stopCut();
    const was = selected;
    selected = next;
    corner = null;
    added = null;
    if (was !== null) polygons[was]?.setOptions(style);
    if (next !== null) polygons[next]?.setOptions(selectedStyle);
    hidePlus();
    drawHandles();
    announce();
  }

  function selectCorner(at: CornerAt | null) {
    corner = at;
    drawHandles();
    announce();
  }

  /** The menu at the pointer, kept inside the map. */
  function openMenu(event: MouseEvent, items: PieceMenuItem[]) {
    const within = onScreen(map);
    const box = within.getBoundingClientRect();
    options.onMenu({
      within,
      x: Math.max(
        4,
        Math.min(event.clientX - box.left, box.width - MENU_WIDTH - 4),
      ),
      y: Math.max(
        4,
        Math.min(
          event.clientY - box.top,
          box.height - items.length * MENU_ITEM_HEIGHT - 12,
        ),
      ),
      items,
    });
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
        if (!editable || clickIgnored()) return;
        options.onMenu(null);
        select(index);
      });
      polygon.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
        if (editable && event.domEvent instanceof MouseEvent) {
          openMenu(event.domEvent, [deleteItem(index)]);
        }
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
      pixels = [];
      return;
    }
    pixels = piece.map((ring) =>
      ring.map((at) => {
        const p = proj.fromLatLngToDivPixel(latLngOf(at))!;
        return { x: p.x, y: p.y };
      }),
    );
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ring of pixels) {
      for (const p of ring) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    // The SVG covers the piece and a margin, so its own numbers stay small.
    origin = { x: minX - PAD, y: minY - PAD };
    svg.style.display = "block";
    svg.style.left = `${origin.x}px`;
    svg.style.top = `${origin.y}px`;
    svg.setAttribute("width", String(maxX + PAD - origin.x));
    svg.setAttribute("height", String(maxY + PAD - origin.y));
    body.style.cursor = cutFrom ? "crosshair" : "move";
    body.setAttribute(
      "d",
      pixels
        .map(
          (ring) =>
            `M${ring.map((p) => `${p.x - origin.x},${p.y - origin.y}`).join("L")}Z`,
        )
        .join(""),
    );
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y) < CORNER_GAP;
    const shown = pixels.map((ring, r) => {
      const kept: { p: { x: number; y: number }; i: number }[] = [];
      for (const [i, p] of ring.entries()) {
        const at = { ring: r, corner: i };
        const always =
          sameCorner(at, corner) ||
          sameCorner(at, added) ||
          sameCorner(at, cutFrom);
        const last = kept.at(-1);
        if (!last || always || !near(p, last.p)) kept.push({ p, i });
      }
      // The ring closes: its last corner drawn is next to its first.
      if (kept.length > 1 && near(kept.at(-1)!.p, kept[0]!.p)) kept.pop();
      return kept;
    });
    const wanted = shown.reduce((n, ring) => n + ring.length, 0);
    while (corners.childNodes.length > wanted) corners.lastChild!.remove();
    while (corners.childNodes.length < wanted) {
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("stroke", GREEN);
      dot.setAttribute("stroke-width", "2");
      corners.appendChild(dot);
    }
    let at = 0;
    shown.forEach((ring, r) => {
      ring.forEach(({ p, i }) => {
        const dot = corners.childNodes[at++] as SVGCircleElement;
        const picked =
          sameCorner({ ring: r, corner: i }, corner) ||
          sameCorner({ ring: r, corner: i }, cutFrom);
        dot.setAttribute("cx", String(p.x - origin.x));
        dot.setAttribute("cy", String(p.y - origin.y));
        dot.setAttribute(
          "r",
          String(picked ? CORNER_RADIUS + 1 : CORNER_RADIUS),
        );
        dot.setAttribute("fill", picked ? GREEN : "#fff");
        dot.style.cursor = cutFrom ? "crosshair" : "grab";
        dot.dataset.ring = String(r);
        dot.dataset.corner = String(i);
      });
    });
  }

  /**
   * The pointer in the pane's pixels, measured from the pane the handles
   * are drawn in, not from the map's box, which in full screen stays where
   * it was on the page.
   */
  function pixelAt(event: MouseEvent) {
    const pane = overlay.getPanes()?.overlayMouseTarget;
    if (!pane) return null;
    const box = pane.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  /** The map's point under the pointer, as a corner. */
  function cornerAt(event: MouseEvent): LngLat | null {
    const p = pixelAt(event);
    const at = p
      ? projection()?.fromDivPixelToLatLng(new google.maps.Point(p.x, p.y))
      : null;
    return at ? [at.lng(), at.lat()] : null;
  }

  /**
   * The selected piece's edge nearest the pointer, and the point on it, as
   * a corner, when it is within `reach` pixels; null otherwise.
   */
  function edgeNear(event: MouseEvent, reach: number) {
    const proj = projection();
    const p = pixelAt(event);
    if (!proj || !p || pixels.length === 0) return null;
    let best: {
      ring: number;
      after: number;
      x: number;
      y: number;
      distance: number;
    } | null = null;
    for (const [r, ring] of pixels.entries()) {
      for (const [i, a] of ring.entries()) {
        const hit = nearestOnSegment(p, a, ring[(i + 1) % ring.length]!);
        if (!best || hit.distance < best.distance) {
          best = { ring: r, after: i, ...hit };
        }
      }
    }
    if (!best || best.distance > reach) return null;
    const point = proj.fromDivPixelToLatLng(
      new google.maps.Point(best.x, best.y),
    );
    return point
      ? {
          ring: best.ring,
          after: best.after,
          x: best.x,
          y: best.y,
          corner: [point.lng(), point.lat()] as LngLat,
        }
      : null;
  }

  /** Puts the change on the map and reports it. */
  function changed(index: number) {
    polygons[index]?.setPaths(pieces[index]!.map(pathOf));
    drawHandles();
    report();
  }

  /** A corner on the edge after `after`, selected and shown however near its neighbours. */
  function addCorner(
    index: number,
    edge: { ring: number; after: number; corner: LngLat },
  ): CornerAt {
    pieces[index]![edge.ring]!.splice(edge.after + 1, 0, edge.corner);
    added = { ring: edge.ring, corner: edge.after + 1 };
    corner = added;
    return added;
  }

  function removeCorner(index: number, at: CornerAt) {
    const ring = pieces[index]![at.ring]!;
    if (ring.length <= MIN_CORNERS) {
      options.onNotice("A piece keeps at least three corners.", "refused");
      return;
    }
    ring.splice(at.corner, 1);
    corner = null;
    added = null;
    changed(index);
    announce();
  }

  function deletePiece(index: number) {
    if (pieces.length <= 1) {
      options.onNotice(
        "A zone keeps at least one piece. Remove the zone itself on the Coverage tab.",
        "refused",
      );
      return;
    }
    stopCut();
    pieces = pieces.filter((_, i) => i !== index);
    // Another piece keeps its selection, one place along if it came after.
    const was = selected;
    selected =
      was === null || was === index ? null : was > index ? was - 1 : was;
    if (selected !== was) corner = null;
    added = null;
    drawPolygons();
    drawHandles();
    announce();
    report();
  }

  const deleteItem = (index: number): PieceMenuItem => ({
    label: "Delete this piece",
    danger: true,
    run: () => deletePiece(index),
  });

  const addCornerItem = (
    index: number,
    edge: { ring: number; after: number; corner: LngLat },
  ): PieceMenuItem => ({
    label: "Add a corner here",
    run: () => {
      addCorner(index, edge);
      changed(index);
      announce();
    },
  });

  const OUTER_EDGE =
    "A cut runs between two corners of the piece's outer edge, not a hole's.";

  function startCut() {
    if (selected === null || !corner) return;
    if (corner.ring !== 0) {
      options.onNotice(OUTER_EDGE, "refused");
      return;
    }
    cutFrom = corner;
    hidePlus();
    drawHandles();
    options.onCutting(true);
  }

  function finishCut(to: CornerAt) {
    const from = cutFrom;
    const index = selected;
    stopCut();
    if (!from || index === null) return;
    const cut =
      to.ring === 0
        ? cutPolygonBetween(pieces[index]!, from.corner, to.corner)
        : null;
    if (!cut || !cut.ok) {
      if (!cut) options.onNotice(OUTER_EDGE, "refused");
      else if (cut.reason !== "same") {
        options.onNotice(
          cut.reason === "adjacent"
            ? "Those corners are next to each other: there is nothing between them to cut. Pick one further along."
            : "The straight line between those corners leaves the piece. Pick two corners the line between stays inside it.",
          "refused",
        );
      }
      drawHandles();
      return;
    }
    pieces.splice(index, 1, ...cut.parts);
    ignoreClickUntil = performance.now() + 500;
    selected = null;
    corner = null;
    added = null;
    drawPolygons();
    drawHandles();
    announce();
    report();
    options.onNotice(
      "Cut in two. Click the part you do not want, then delete it with the bin.",
      "done",
    );
  }

  // The "+" on the edge under the pointer, while a piece is selected; the
  // cut's line from its first corner to the pointer, while one waits.
  let edgeUnder: { ring: number; after: number; corner: LngLat } | null = null;
  function hidePlus() {
    edgeUnder = null;
    plus.style.display = "none";
  }
  function onHover(event: PointerEvent) {
    if (drag || !editable || selected === null) return;
    if (cutFrom) {
      const start = pixels[cutFrom.ring]?.[cutFrom.corner];
      const p = pixelAt(event);
      if (p && start) {
        line.style.display = "block";
        line.setAttribute("x1", String(start.x - origin.x));
        line.setAttribute("y1", String(start.y - origin.y));
        line.setAttribute("x2", String(p.x - origin.x));
        line.setAttribute("y2", String(p.y - origin.y));
      }
      return;
    }
    const target = event.target as Element;
    if (plus.contains(target)) return;
    if (target instanceof SVGElement && target.dataset.corner !== undefined) {
      hidePlus();
      return;
    }
    const edge = edgeNear(event, EDGE_PX);
    if (!edge) {
      hidePlus();
      return;
    }
    edgeUnder = edge;
    plus.style.display = "block";
    plus.setAttribute(
      "transform",
      `translate(${edge.x - origin.x},${edge.y - origin.y})`,
    );
  }
  const host = map.getDiv();
  host.addEventListener("pointermove", onHover, true);

  // While a hand is on a corner, the "+" or inside the piece, the map holds
  // still; anywhere else it pans and zooms as ever.
  let drag:
    | {
        kind: "corner";
        at: CornerAt;
        moved: boolean;
        /** A corner the "+" just added: a change, moved or not. */
        added: boolean;
      }
    | {
        kind: "piece";
        from: LngLat;
        original: OpenPiece;
        moved: boolean;
      }
    | null = null;
  let gestures: google.maps.MapOptions["gestureHandling"] = "auto";

  // The body, the corners and the "+" keep their clicks from the map: a
  // drag on them is not a pan, a click not a deselect.
  const stop = (event: Event) => event.stopPropagation();
  for (const type of ["mousedown", "click", "dblclick", "touchstart"]) {
    group.addEventListener(type, stop);
  }

  group.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || selected === null) return;
    event.stopPropagation();
    event.preventDefault();
    options.onMenu(null);
    const target = event.target as SVGElement;
    const at: CornerAt | null =
      target.dataset.corner !== undefined
        ? {
            ring: Number(target.dataset.ring),
            corner: Number(target.dataset.corner),
          }
        : null;
    if (cutFrom) {
      // A cut waits for its second corner; a press elsewhere on the piece stops it.
      if (at) finishCut(at);
      else {
        stopCut();
        drawHandles();
      }
      return;
    }
    const from = cornerAt(event);
    if (!from) return;
    gestures = map.get("gestureHandling") ?? "auto";
    map.setOptions({ gestureHandling: "none" });
    try {
      group.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks cannot be captured; the
      // drag still follows it while it stays over the piece.
    }
    if (plus.contains(target) && edgeUnder) {
      const made = addCorner(selected, edgeUnder);
      hidePlus();
      polygons[selected]?.setPaths(pieces[selected]!.map(pathOf));
      drawHandles();
      announce();
      drag = { kind: "corner", at: made, moved: false, added: true };
    } else if (at) {
      if (!sameCorner(at, corner)) selectCorner(at);
      drag = { kind: "corner", at, moved: false, added: false };
    } else {
      if (corner) selectCorner(null);
      drag = {
        kind: "piece",
        from,
        original: pieces[selected]!.map((ring) => [...ring]),
        moved: false,
      };
    }
  });

  group.addEventListener("pointermove", (event) => {
    if (!drag || selected === null) return;
    const at = cornerAt(event);
    if (!at) return;
    const piece = pieces[selected]!;
    if (drag.kind === "corner") {
      piece[drag.at.ring]![drag.at.corner] = at;
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
    const changedIt = drag.moved || (drag.kind === "corner" && drag.added);
    drag = null;
    map.setOptions({ gestureHandling: gestures });
    if (changedIt) report();
  }
  group.addEventListener("pointerup", endDrag);
  group.addEventListener("pointercancel", endDrag);

  // A right-click, the same choices as a shortcut: on a corner of the
  // selected piece, on an edge it is near, or on the piece itself.
  group.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (selected === null) return;
    stopCut();
    const index = selected;
    const target = event.target as SVGElement;
    if (target.dataset.corner !== undefined) {
      const at = {
        ring: Number(target.dataset.ring),
        corner: Number(target.dataset.corner),
      };
      selectCorner(at);
      openMenu(event, [
        { label: "Remove this corner", run: () => removeCorner(index, at) },
        { label: "Cut from this corner", run: startCut },
        deleteItem(index),
      ]);
      return;
    }
    const edge = edgeNear(event, MENU_EDGE_PX);
    openMenu(
      event,
      edge
        ? [addCornerItem(index, edge), deleteItem(index)]
        : [deleteItem(index)],
    );
  });

  // Just outside the selected piece, a right-click near its edge adds a
  // corner there too.
  const mapRightClick = map.addListener(
    "rightclick",
    (event: google.maps.MapMouseEvent) => {
      if (
        !editable ||
        selected === null ||
        !(event.domEvent instanceof MouseEvent)
      ) {
        options.onMenu(null);
        return;
      }
      const edge = edgeNear(event.domEvent, MENU_EDGE_PX);
      if (edge) openMenu(event.domEvent, [addCornerItem(selected, edge)]);
      else options.onMenu(null);
    },
  );
  const mapClick = map.addListener("click", () => {
    if (clickIgnored()) return;
    options.onMenu(null);
    select(null);
  });
  const mapMoved = [
    map.addListener("dragstart", () => options.onMenu(null)),
    map.addListener("zoom_changed", () => options.onMenu(null)),
  ];

  function removeSelected() {
    if (selected === null) return;
    if (corner) removeCorner(selected, corner);
    else deletePiece(selected);
  }

  // Delete and Backspace take away what is selected; Esc stops a cut, then
  // lets go of the corner, then of the piece. Not while a field is typed in.
  function onKey(event: KeyboardEvent) {
    if (!editable || selected === null || typing(event.target)) return;
    if (event.key === "Escape") {
      if (cutFrom) {
        stopCut();
        drawHandles();
      } else if (corner) selectCorner(null);
      else select(null);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSelected();
    }
  }
  document.addEventListener("keydown", onKey);

  return {
    setPieces(next) {
      // A selection stays on a shape of as many pieces, an undone corner or
      // move; with pieces added or gone, it could name another one.
      const same = next.length === pieces.length;
      stopCut();
      pieces = next.map((piece) => piece.map(open));
      corner = null;
      added = null;
      if (selected !== null && !same) selected = null;
      options.onMenu(null);
      hidePlus();
      drawPolygons();
      drawHandles();
      announce();
    },
    setEditable(next) {
      if (next === editable) return;
      editable = next;
      for (const polygon of polygons) polygon.setOptions({ clickable: next });
      if (!next) {
        options.onMenu(null);
        stopCut();
        hidePlus();
      }
      drawHandles();
    },
    addPiece(ring) {
      stopCut();
      pieces = [...pieces, [open(ring)]];
      selected = pieces.length - 1;
      corner = null;
      added = null;
      drawPolygons();
      drawHandles();
      announce();
      report();
    },
    removeSelected,
    startCut,
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onHover, true);
      document.removeEventListener("keydown", onKey);
      mapClick.remove();
      mapRightClick.remove();
      for (const listener of mapMoved) listener.remove();
      for (const polygon of polygons) polygon.setMap(null);
      overlay.setMap(null);
    },
  };
}
