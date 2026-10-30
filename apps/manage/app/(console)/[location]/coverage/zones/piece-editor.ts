/// <reference types="google.maps" />

import { cutPolygonBetween, type LngLat, type MultiPolygon } from "@repo/db";
import { isTyping } from "@repo/ui/keys";
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
 * - Shift+click, or Ctrl+click (⌘+click on a Mac, where Ctrl+click is the
 *   right-click), adds a piece to the selection or takes it out: several
 *   are deleted together, or merged where they overlap or meet, and show
 *   no corners;
 * - a drag on a corner moves it, a drag inside the piece moves the piece
 *   alone, and a drag anywhere else moves the map;
 * - a box runs around the piece selected, a square at each of its corners:
 *   a drag on one grows or shrinks the piece about its middle, so a circle
 *   stays round and keeps its centre;
 * - pointing at an edge shows one "+" on it, under the pointer: a click
 *   adds a corner there, a drag adds and moves it;
 * - the toolbar, or Delete and Backspace, removes the corner selected, or
 *   the pieces; its scissors cut the piece from the corner selected to
 *   another one clicked, along the straight line between them; Esc stops.
 *
 * A right-click opens a menu of the same choices, as a shortcut, and on a
 * piece offers to delete all the others, to keep a main island only. Every
 * change reports the whole shape once, when it is done, so each is one
 * step of Undo. Browser only.
 */

/** A piece as it is edited: its rings open, the first corner not repeated at the end. */
type OpenPiece = LngLat[][];

/** A corner of the piece selected, by its ring and its place in it. */
type CornerAt = { ring: number; corner: number };

/** A point in the pane's pixels. */
type Pixel = { x: number; y: number };

/** A drag on a square of the box around the piece selected. */
type Resize = {
  kind: "size";
  /** The piece's middle, the corner of its box held, and the pointer on it, in the pane's pixels. */
  middle: Pixel;
  held: Pixel;
  from: Pixel;
  /** The piece's middle on the map, which stays put. */
  pivot: LngLat;
  original: OpenPiece;
  moved: boolean;
};

/** One choice of the right-click menu. */
export type PieceMenuItem = {
  label: string;
  /** A choice that takes something away. */
  danger?: boolean;
  run: () => void;
};

/** The right-click menu, at a point of the map's box in pixels. */
export type PieceMenu = { x: number; y: number; items: PieceMenuItem[] };

/** What is selected: how many pieces, and whether a corner of the one is. */
export type PieceSelection = { pieces: number; corner: boolean } | null;

type PieceEditorOptions = {
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
  /**
   * The pieces put together where they overlap or meet, each ring closed,
   * worked out on the server, where the shape arithmetic is; or why not.
   */
  join: (
    pieces: MultiPolygon,
  ) => Promise<
    { ok: true; pieces: MultiPolygon } | { ok: false; error: string }
  >;
};

export type PieceEditor = {
  /** Draws the pieces handed in: a new shape, or one undone. */
  setPieces: (pieces: MultiPolygon) => void;
  /** Whether a hand may change them; when not, they are only drawn. */
  setEditable: (editable: boolean) => void;
  /** A new piece, selected, added after the others. */
  addPiece: (ring: LngLat[]) => void;
  /** Removes the corner selected, else deletes the pieces selected. */
  removeSelected: () => void;
  /** Starts a cut from the corner selected. */
  startCut: () => void;
  /** Merges the pieces selected where they overlap or meet, in one step. */
  joinSelected: () => Promise<void>;
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
/** How far outside the piece its box runs, in pixels, clear of a square's corners. */
const BOX_GAP = 12;
/** The side of a square on the box's corners, in pixels. */
const GRIP = 10;
/** The box's corners, top left first and clockwise, as which way each lies from the middle. */
const GRIP_SIDES = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;
/** The least a piece shrinks to: its box's corners this far from its middle, in pixels. */
const MIN_SIZE = 12;
/** Room around the piece for its corners, the "+", its box and the squares on it. */
const PAD = Math.max(CORNER_RADIUS + EDGE_PX, BOX_GAP + GRIP / 2) + 2;
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
function nearestOnSegment(p: Pixel, a: Pixel, b: Pixel) {
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
 * The piece as a drag on a square of its box leaves it: the corner held
 * follows the pointer along the line from the middle, and the piece grows
 * or shrinks by as much about its middle, every way alike. It shrinks no
 * smaller than MIN_SIZE, unless it already was.
 */
function resized(resize: Resize, pointer: Pixel): OpenPiece {
  const ax = resize.held.x - resize.middle.x;
  const ay = resize.held.y - resize.middle.y;
  const reach = Math.hypot(ax, ay);
  if (reach === 0) return resize.original;
  const bx = ax + pointer.x - resize.from.x;
  const by = ay + pointer.y - resize.from.y;
  const scale = Math.max(
    Math.min(1, MIN_SIZE / reach),
    (bx * ax + by * ay) / (reach * reach),
  );
  const [lng0, lat0] = resize.pivot;
  return resize.original.map((ring) =>
    ring.map(([lng, lat]): LngLat => [
      lng0 + (lng - lng0) * scale,
      lat0 + (lat - lat0) * scale,
    ]),
  );
}

/** Whether a click adds to the selection or takes from it, not selects afresh. */
const adds = (event: unknown) =>
  event instanceof MouseEvent &&
  (event.shiftKey || event.ctrlKey || event.metaKey);

export function createPieceEditor(options: PieceEditorOptions): PieceEditor {
  const { map, library, style, selectedStyle } = options;
  let pieces: OpenPiece[] = [];
  let polygons: google.maps.Polygon[] = [];
  // The pieces selected, in their order; with one, its corners, its box and
  // the "+" show, and `single` names it.
  let chosen: number[] = [];
  const single = () => (chosen.length === 1 ? chosen[0]! : null);
  // The corner selected, the one just added, and the first of a cut.
  let corner: CornerAt | null = null;
  let added: CornerAt | null = null;
  let cutFrom: CornerAt | null = null;
  // The selected piece's corners in the pane's pixels, the box around them,
  // and where its SVG sits.
  let pixels: Pixel[][] = [];
  let bounds = { left: 0, top: 0, right: 0, bottom: 0 };
  let origin: Pixel = { x: 0, y: 0 };
  let editable = false;
  let frame = 0;
  // The click that ends a cut lands on a part it made; it is not a pick.
  let ignoreClickUntil = 0;
  const clickIgnored = () => performance.now() < ignoreClickUntil;
  // Counts the changes and the shapes handed in: a merge worked out on the
  // server applies only to the pieces it was asked for.
  let version = 0;

  // The selected piece's body, its corners, the "+", the cut's line and the
  // box with its squares, over the map: an SVG in the pane, positioned on
  // every redraw. Only the body, the corners, the "+" and the squares take
  // the mouse; the rest of the SVG's box lets it through to the map.
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
  const outline = document.createElementNS(SVG_NS, "rect");
  outline.setAttribute("fill", "none");
  outline.setAttribute("stroke", GREEN);
  outline.setAttribute("stroke-width", "1");
  outline.setAttribute("stroke-dasharray", "4 3");
  outline.style.pointerEvents = "none";
  const grips = document.createElementNS(SVG_NS, "g");
  grips.style.pointerEvents = "visiblePainted";
  for (const [i, [sx, sy]] of GRIP_SIDES.entries()) {
    const grip = document.createElementNS(SVG_NS, "rect");
    grip.setAttribute("width", String(GRIP));
    grip.setAttribute("height", String(GRIP));
    grip.setAttribute("fill", "#fff");
    grip.setAttribute("stroke", GREEN);
    grip.setAttribute("stroke-width", "1.5");
    grip.style.cursor = sx === sy ? "nwse-resize" : "nesw-resize";
    grip.dataset.grip = String(i);
    grips.appendChild(grip);
  }
  group.append(body, outline, line, corners, plus, grips);
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
    version++;
    // A menu still open names pieces and corners by their place, which
    // the change may have moved: Delete pressed while it has the focus, or
    // a merge answered meanwhile.
    options.onMenu(null);
    options.onChange(pieces.map((piece) => piece.map(closed)));
  }

  function announce() {
    options.onSelect(
      chosen.length === 0
        ? null
        : { pieces: chosen.length, corner: corner !== null },
    );
  }

  /** Lets go of a cut waiting for its second corner, its line gone and the box back. */
  function stopCut() {
    if (!cutFrom) return;
    cutFrom = null;
    line.style.display = "none";
    drawHandles();
    options.onCutting(false);
  }

  /** Selects the pieces, in their order, and no corner. */
  function choose(next: number[]) {
    const sorted = next.filter((i) => i < pieces.length).sort((a, b) => a - b);
    if (
      sorted.length === chosen.length &&
      sorted.every((i, at) => i === chosen[at])
    ) {
      return;
    }
    stopCut();
    const was = chosen;
    chosen = sorted;
    corner = null;
    added = null;
    for (const i of was) {
      if (!sorted.includes(i)) polygons[i]?.setOptions(style);
    }
    for (const i of sorted) polygons[i]?.setOptions(selectedStyle);
    hidePlus();
    drawHandles();
    announce();
  }

  /** Selects the one piece, or none. */
  const select = (index: number | null) =>
    choose(index === null ? [] : [index]);

  /** Adds the piece to the selection, or takes it out. */
  const toggle = (index: number) =>
    choose(
      chosen.includes(index)
        ? chosen.filter((i) => i !== index)
        : [...chosen, index],
    );

  function selectCorner(at: CornerAt | null) {
    corner = at;
    drawHandles();
    announce();
  }

  /** The menu at the pointer, kept inside the map. */
  function openMenu(event: MouseEvent, items: PieceMenuItem[]) {
    const box = map.getDiv().getBoundingClientRect();
    options.onMenu({
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
        ...(chosen.includes(index) ? selectedStyle : style),
        paths: piece.map(pathOf),
        clickable: editable,
        map,
      });
      polygon.addListener("click", (event: google.maps.PolyMouseEvent) => {
        if (!editable || clickIgnored()) return;
        options.onMenu(null);
        if (adds(event.domEvent)) toggle(index);
        else select(index);
      });
      polygon.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
        if (editable && event.domEvent instanceof MouseEvent) {
          openMenu(event.domEvent, pieceItems(index));
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
    const index = single();
    const piece = index === null ? undefined : pieces[index];
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
    bounds = {
      left: Infinity,
      top: Infinity,
      right: -Infinity,
      bottom: -Infinity,
    };
    for (const ring of pixels) {
      for (const p of ring) {
        bounds.left = Math.min(bounds.left, p.x);
        bounds.top = Math.min(bounds.top, p.y);
        bounds.right = Math.max(bounds.right, p.x);
        bounds.bottom = Math.max(bounds.bottom, p.y);
      }
    }
    // The SVG covers the piece and a margin, so its own numbers stay small.
    origin = { x: bounds.left - PAD, y: bounds.top - PAD };
    svg.style.display = "block";
    svg.style.left = `${origin.x}px`;
    svg.style.top = `${origin.y}px`;
    svg.setAttribute("width", String(bounds.right + PAD - origin.x));
    svg.setAttribute("height", String(bounds.bottom + PAD - origin.y));
    // The box and its squares, put away while a cut waits for its corner.
    const boxWidth = bounds.right - bounds.left + 2 * BOX_GAP;
    const boxHeight = bounds.bottom - bounds.top + 2 * BOX_GAP;
    const boxDisplay = cutFrom ? "none" : "block";
    outline.style.display = boxDisplay;
    grips.style.display = boxDisplay;
    outline.setAttribute("x", String(PAD - BOX_GAP));
    outline.setAttribute("y", String(PAD - BOX_GAP));
    outline.setAttribute("width", String(boxWidth));
    outline.setAttribute("height", String(boxHeight));
    for (const [i, [sx, sy]] of GRIP_SIDES.entries()) {
      const grip = grips.childNodes[i] as SVGRectElement;
      const x = PAD - BOX_GAP + ((sx + 1) / 2) * boxWidth;
      const y = PAD - BOX_GAP + ((sy + 1) / 2) * boxHeight;
      grip.setAttribute("x", String(x - GRIP / 2));
      grip.setAttribute("y", String(y - GRIP / 2));
    }
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
    const near = (a: Pixel, b: Pixel) =>
      Math.hypot(a.x - b.x, a.y - b.y) < CORNER_GAP;
    const shown = pixels.map((ring, r) => {
      const kept: { p: Pixel; i: number }[] = [];
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
   * are drawn in, so it holds wherever the map is on the screen.
   */
  function pixelAt(event: MouseEvent): Pixel | null {
    const pane = overlay.getPanes()?.overlayMouseTarget;
    if (!pane) return null;
    const box = pane.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  /** The map's point at a pixel of the pane, as a corner. */
  function cornerOf(p: Pixel): LngLat | null {
    const at = projection()?.fromDivPixelToLatLng(
      new google.maps.Point(p.x, p.y),
    );
    return at ? [at.lng(), at.lat()] : null;
  }

  /** The map's point under the pointer, as a corner. */
  function cornerAt(event: MouseEvent): LngLat | null {
    const p = pixelAt(event);
    return p ? cornerOf(p) : null;
  }

  /**
   * The selected piece's edge nearest the pointer, and the point on it, as
   * a corner, when it is within `reach` pixels; null otherwise.
   */
  function edgeNear(event: MouseEvent, reach: number) {
    const p = pixelAt(event);
    if (!p || pixels.length === 0) return null;
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
    const at = cornerOf(best);
    return at
      ? { ring: best.ring, after: best.after, x: best.x, y: best.y, corner: at }
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

  /** Deletes the pieces, in one step; the zone keeps one at least. */
  function deletePieces(gone: readonly number[]) {
    if (gone.length >= pieces.length) {
      options.onNotice(
        pieces.length === 1
          ? "A zone keeps at least one piece. Remove the zone itself on Coverage."
          : "A zone keeps at least one piece. Leave one out of the selection, or remove the zone itself on Coverage.",
        "refused",
      );
      return;
    }
    stopCut();
    pieces = pieces.filter((_, i) => !gone.includes(i));
    // The pieces still selected stay so, each a place along for every one
    // gone before it; the one whose corner was selected keeps it.
    const was = chosen;
    chosen = was
      .filter((i) => !gone.includes(i))
      .map((i) => i - gone.filter((g) => g < i).length);
    if (was.length !== 1 || chosen.length !== 1) corner = null;
    added = null;
    drawPolygons();
    drawHandles();
    announce();
    report();
  }

  const deleteItem = (index: number): PieceMenuItem => ({
    label: "Delete this piece",
    danger: true,
    run: () => deletePieces([index]),
  });

  /** A right-click on a piece: delete it, or, of several, every other one, to keep a main island only. */
  const pieceItems = (index: number): PieceMenuItem[] => [
    deleteItem(index),
    ...(pieces.length > 1
      ? [
          {
            label: "Delete the other pieces",
            danger: true,
            run: () => {
              deletePieces(pieces.flatMap((_, i) => (i === index ? [] : [i])));
              select(0);
            },
          },
        ]
      : []),
  ];

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
    if (single() === null || !corner) return;
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
    const index = single();
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
      return;
    }
    pieces.splice(index, 1, ...cut.parts);
    ignoreClickUntil = performance.now() + 500;
    chosen = [];
    corner = null;
    added = null;
    drawPolygons();
    drawHandles();
    announce();
    report();
    options.onNotice(
      "Cut in two. Click the part you do not want and delete it with the bin, or Undo to join them again.",
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
    if (drag || !editable || single() === null) return;
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
    if (
      target instanceof SVGElement &&
      (target.dataset.corner !== undefined || target.dataset.grip !== undefined)
    ) {
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

  // While a hand is on a corner, the "+", a square of the box or inside the
  // piece, the map holds still; anywhere else it pans and zooms as ever.
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
    | Resize
    | null = null;
  let gestures: google.maps.MapOptions["gestureHandling"] = "auto";

  /** A drag on the box's square `grip` of piece `index`, from the pointer on it. */
  function resizeFrom(index: number, grip: number, from: Pixel): Resize | null {
    const [sx, sy] = GRIP_SIDES[grip] ?? GRIP_SIDES[0];
    const middle = {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2,
    };
    const pivot = cornerOf(middle);
    if (!pivot) return null;
    return {
      kind: "size",
      middle,
      held: {
        x: middle.x + (sx * (bounds.right - bounds.left)) / 2,
        y: middle.y + (sy * (bounds.bottom - bounds.top)) / 2,
      },
      from,
      pivot,
      original: pieces[index]!.map((ring) => [...ring]),
      moved: false,
    };
  }

  // The body, the corners, the "+" and the squares keep their clicks from
  // the map: a drag on them is not a pan, a click not a deselect.
  const stop = (event: Event) => event.stopPropagation();
  for (const type of ["mousedown", "click", "dblclick", "touchstart"]) {
    group.addEventListener(type, stop);
  }

  group.addEventListener("pointerdown", (event) => {
    const selected = single();
    if (event.button !== 0 || selected === null) return;
    event.stopPropagation();
    event.preventDefault();
    options.onMenu(null);
    const target = event.target as SVGElement;
    // Shift+click inside the piece takes it out of the selection, as on
    // any other piece; on its corners and squares it is a plain press.
    if (adds(event) && !cutFrom && target === body) {
      toggle(selected);
      return;
    }
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
      else stopCut();
      return;
    }
    const p = pixelAt(event);
    const from = p ? cornerOf(p) : null;
    if (!p || !from) return;
    const grip = target.dataset.grip;
    const resize =
      grip === undefined ? null : resizeFrom(selected, Number(grip), p);
    if (grip !== undefined && !resize) return;
    gestures = map.get("gestureHandling") ?? "auto";
    map.setOptions({ gestureHandling: "none" });
    try {
      group.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks cannot be captured; the
      // drag still follows it while it stays over the piece.
    }
    if (resize) {
      drag = resize;
    } else if (plus.contains(target) && edgeUnder) {
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
    const selected = single();
    if (!drag || selected === null) return;
    if (drag.kind === "size") {
      const p = pixelAt(event);
      if (!p) return;
      pieces[selected] = resized(drag, p);
    } else {
      const at = cornerAt(event);
      if (!at) return;
      if (drag.kind === "corner") {
        pieces[selected]![drag.at.ring]![drag.at.corner] = at;
      } else {
        const dLng = at[0] - drag.from[0];
        const dLat = at[1] - drag.from[1];
        pieces[selected] = drag.original.map((ring) =>
          ring.map(([lng, lat]): LngLat => [lng + dLng, lat + dLat]),
        );
      }
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
    const index = single();
    if (index === null) return;
    stopCut();
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
    openMenu(event, [
      ...(edge ? [addCornerItem(index, edge)] : []),
      ...pieceItems(index),
    ]);
  });

  // Just outside the selected piece, a right-click near its edge adds a
  // corner there too.
  const mapRightClick = map.addListener(
    "rightclick",
    (event: google.maps.MapMouseEvent) => {
      const selected = single();
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
  // A click on the map lets go of the selection; one adding to it, missing
  // the piece, keeps it.
  const mapClick = map.addListener(
    "click",
    (event: google.maps.MapMouseEvent) => {
      if (clickIgnored()) return;
      options.onMenu(null);
      if (!adds(event.domEvent)) select(null);
    },
  );
  const mapMoved = [
    map.addListener("dragstart", () => options.onMenu(null)),
    map.addListener("zoom_changed", () => options.onMenu(null)),
  ];

  /**
   * Merges the pieces selected where they overlap or meet: what joins takes
   * the place of the first of them, selected; pieces apart stay apart.
   * Dropped when the pieces changed while the server worked it out.
   */
  async function joinSelected() {
    if (chosen.length < 2) return;
    const at = version;
    const joining = chosen;
    const answer = await options.join(
      joining.map((i) => pieces[i]!.map(closed)),
    );
    if (at !== version) return;
    if (!answer.ok) {
      options.onNotice(answer.error, "refused");
      return;
    }
    if (answer.pieces.length >= joining.length) {
      options.onNotice(
        "Those pieces do not meet, so they stay apart. Move one onto another first.",
        "refused",
      );
      return;
    }
    stopCut();
    const first = joining[0]!;
    const kept = pieces.filter((_, i) => !joining.includes(i));
    const joined = answer.pieces.map((piece) => piece.map(open));
    pieces = [...kept.slice(0, first), ...joined, ...kept.slice(first)];
    chosen = joined.map((_, i) => first + i);
    corner = null;
    added = null;
    drawPolygons();
    drawHandles();
    announce();
    report();
    options.onNotice(
      joined.length === 1
        ? "Merged into one piece."
        : "Merged the pieces that meet; the others stay apart.",
      "done",
    );
  }

  function removeSelected() {
    const selected = single();
    if (selected !== null && corner) removeCorner(selected, corner);
    else if (chosen.length > 0) deletePieces(chosen);
  }

  // Delete and Backspace take away what is selected; Esc stops a cut, then
  // lets go of the corner, then of the pieces. Not while a field is typed in.
  function onKey(event: KeyboardEvent) {
    if (!editable || chosen.length === 0 || isTyping(event.target)) return;
    if (event.key === "Escape") {
      if (cutFrom) stopCut();
      else if (corner) selectCorner(null);
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
      version++;
      stopCut();
      pieces = next.map((piece) => piece.map(open));
      corner = null;
      added = null;
      if (!same) chosen = [];
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
      chosen = [pieces.length - 1];
      corner = null;
      added = null;
      drawPolygons();
      drawHandles();
      announce();
      report();
    },
    removeSelected,
    startCut,
    joinSelected,
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
