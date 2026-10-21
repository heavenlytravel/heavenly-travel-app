/// <reference types="google.maps" />

"use client";

import {
  circleRing,
  isRing,
  type MultiPolygon,
  type Ring,
  type ZoneShape,
} from "@repo/db";
import { cx } from "@repo/ui/cx";
import {
  CirclePlusIcon,
  HandIcon,
  MaximizeIcon,
  MinimizeIcon,
  PencilIcon,
  RedoIcon,
  ScissorsIcon,
  SquarePlusIcon,
  TrashIcon,
  UndoIcon,
} from "@repo/ui/icons";
import { Tooltip } from "@repo/ui/tooltip";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  MAP_FAILURES,
  boundsOf,
  pathOf,
  pathsOf,
  sameShape,
  useGoogleMap,
  type DistrictOutline,
  type MukimChoice,
  type OtherZone,
} from "./map-shapes";
import {
  createPieceEditor,
  typing,
  type PieceEditor,
  type PieceMenu,
  type PieceSelection,
} from "./piece-editor";

export type {
  DistrictChoice,
  DistrictOutline,
  MukimChoice,
  OtherZone,
} from "./map-shapes";

/** How much of the view a new circle or square takes. */
const STARTER_SHARE = 0.25;

/** How long a notice stays under the map. */
const NOTICE_MS = 4000;

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
/** On a zone in the way, as the trim chosen would leave it: drawn stronger, to be checked. */
const TRIMMED_STYLE: google.maps.PolygonOptions = {
  strokeWeight: 3,
  fillOpacity: 0.3,
};
const ZONE_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#059669",
  strokeWeight: 2,
  fillColor: "#059669",
  fillOpacity: 0.22,
  zIndex: 1,
};
/** The piece whose corners show. */
const SELECTED_STYLE: google.maps.PolygonOptions = {
  ...ZONE_STYLE,
  strokeColor: "#047857",
  strokeWeight: 3,
  fillOpacity: 0.35,
};
/** The district's mukims under the zone, an outline of where each lies. */
const MUKIM_STYLE: google.maps.PolygonOptions = {
  strokeColor: "#404040",
  strokeWeight: 1,
  strokeOpacity: 0.7,
  fillOpacity: 0,
  clickable: false,
  zIndex: 0,
};

/** What a hand on the map does: edit the zone, or only move the map. */
type Tool = "edit" | "pan";

/** Another zone's look: this location's in blue, another's in amber. */
const styleOf = (other: OtherZone) =>
  other.location ? OTHER_LOCATION_STYLE : CONTEXT_STYLE;

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

/** A shape as its pieces, and back: one piece of one ring is stored as a ring. */
const piecesOf = (shape: ZoneShape | null): MultiPolygon =>
  !shape ? [] : isRing(shape) ? [[shape]] : shape;
const shapeOfPieces = (pieces: MultiPolygon): ZoneShape | null =>
  pieces.length === 0
    ? null
    : pieces.length === 1 && pieces[0]!.length === 1
      ? pieces[0]![0]!
      : pieces;

/**
 * The zone maker's map: the districts of the location's states in grey,
 * its other zones in blue, other locations' zones in amber, and the zone
 * being made in green, each piece of land its own shape. The tools sit at
 * the bottom of the map. Its full-screen button, top right where Google
 * keeps its own, puts the map and the line under it on screen together:
 * Google's would show the map alone, and the line's notices with it
 * unseen. With the pencil every
 * edit is a plain click (./piece-editor): select a piece or a corner,
 * drag it, grow or shrink a piece from the squares of its box, add a
 * corner with the "+" on an edge, take away what is selected with the
 * bin, cut a piece in two with the scissors. The square
 * and the circle add a piece in the middle of the view. With the hand
 * nothing changes under a drag. The map pans and zooms with either. The
 * map frames the zone when `frame` changes, a district or a place newly
 * picked, and never on an edit or an undo. With `mukims`, the district's
 * mukims are outlined under the zone. With `trims`, the zones in the way
 * are drawn as the trim chosen would leave them, for a look before saving.
 */
export function ZoneMap({
  mapKey,
  districts,
  others,
  shape,
  frame,
  starters,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  onShapeChange,
  mukims,
  trims,
}: {
  mapKey: string;
  districts: DistrictOutline[];
  others: OtherZone[];
  shape: ZoneShape | null;
  /** Changes when the map should frame the zone afresh. */
  frame: number;
  /** Whether to offer a new circle or square while there is no shape yet. */
  starters: boolean;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onShapeChange: (shape: ZoneShape | null) => void;
  /** The district's mukims to outline under the zone; none while it is not made of them. */
  mukims?: MukimChoice[];
  /** The zones in the way, by id, as the trim chosen would leave them; none while no trim is. */
  trims?: readonly { id: string; shape: ZoneShape }[] | null;
}) {
  const { host, map, library, failed } = useGoogleMap(mapKey, districts, {
    ownFullScreen: true,
  });
  // The map and the line under it, which full screen shows together.
  const wrapper = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const editor = useRef<PieceEditor | null>(null);
  // The other zones as drawn, by id, to show a trim on them.
  const otherPolygons = useRef(new Map<string, google.maps.Polygon>());
  // The shape on the map, as last drawn or reported, to tell an edit made
  // here from a shape handed in.
  const shown = useRef<ZoneShape | null>(null);
  const report = useRef(onShapeChange);
  const [tool, setTool] = useState<Tool>("edit");
  const [selection, setSelection] = useState<PieceSelection>(null);
  const [cutting, setCutting] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    kind: "refused" | "done";
  } | null>(null);
  // The homes of the toolbar and the full-screen button among the map's
  // own controls; made in the browser only, and shown once the map is there.
  const [toolbar] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );
  const [corner] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );
  // The right-click menu, inside the map.
  const [menu, setMenu] = useState<PieceMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editing = tool === "edit";
  const canAdd = shape !== null || starters;

  // The map's listeners outlive a render, so they read the latest callbacks here.
  useEffect(() => {
    report.current = onShapeChange;
  }, [onShapeChange]);

  // Once the map is there: the other zones, the places of the toolbar and
  // the full-screen button in the map's own controls, the zone's pieces,
  // and the view on the shape.
  useEffect(() => {
    if (!map || !library) return;
    const drawn = otherPolygons.current;
    for (const other of others) {
      drawn.set(
        other.id,
        new library.Polygon({
          ...styleOf(other),
          paths: pathsOf(other.shape),
          map,
        }),
      );
    }
    if (toolbar) {
      map.controls[google.maps.ControlPosition.BOTTOM_CENTER]?.push(toolbar);
    }
    if (corner) {
      map.controls[google.maps.ControlPosition.RIGHT_TOP]?.push(corner);
    }

    let noticeTimer = 0;
    editor.current = createPieceEditor({
      map,
      library,
      style: ZONE_STYLE,
      selectedStyle: SELECTED_STYLE,
      onChange: (pieces) => {
        const next = shapeOfPieces(pieces);
        shown.current = next;
        report.current(next);
      },
      onSelect: setSelection,
      onCutting: setCutting,
      onMenu: setMenu,
      onNotice: (message, kind) => {
        setNotice({ message, kind });
        window.clearTimeout(noticeTimer);
        noticeTimer = window.setTimeout(() => setNotice(null), NOTICE_MS);
      },
    });

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
    return () => {
      window.clearTimeout(noticeTimer);
      editor.current?.destroy();
      editor.current = null;
      for (const polygon of drawn.values()) polygon.setMap(null);
      drawn.clear();
    };
    // The other zones and the districts are the page's, drawn once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library]);

  // The zone itself: drawn afresh when a shape is handed in (a district, a
  // circle around a place, an undo), left alone when the change came from a
  // hand on the map.
  useEffect(() => {
    if (!editor.current || sameShape(shape, shown.current)) return;
    shown.current = shape;
    editor.current.setPieces(piecesOf(shape));
  }, [map, library, shape]);

  // A new district or place is framed; an edit or an undo keeps the view.
  const framed = useRef(frame);
  useEffect(() => {
    if (!map || frame === framed.current) return;
    framed.current = frame;
    if (!shape) return;
    const bounds = boundsOf([shape]);
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
  }, [map, frame, shape]);

  useEffect(() => {
    editor.current?.setEditable(editing);
  }, [map, library, editing]);

  // The zones in the way as the trim chosen would leave them; as they are
  // once none is.
  const wasTrimmed = useRef<string[]>([]);
  useEffect(() => {
    if (!map) return;
    const trimmed = new Map(trims?.map((trim) => [trim.id, trim.shape]));
    for (const other of others) {
      const shape = trimmed.get(other.id);
      if (!shape && !wasTrimmed.current.includes(other.id)) continue;
      otherPolygons.current.get(other.id)?.setOptions({
        ...styleOf(other),
        ...(shape ? TRIMMED_STYLE : {}),
        paths: pathsOf(shape ?? other.shape),
      });
    }
    wasTrimmed.current = [...trimmed.keys()];
    // The other zones are the page's, drawn once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library, trims]);

  // The district's mukims under the zone, drawn afresh when the list changes.
  const mukimKey = mukims?.map((mukim) => mukim.code).join(" ") ?? "";
  useEffect(() => {
    if (!map || !library || !mukims) return;
    const outlines = mukims.map(
      (mukim) =>
        new library.Polygon({
          ...MUKIM_STYLE,
          paths: mukim.polygons.flat().map(pathOf),
          map,
        }),
    );
    return () => {
      for (const outline of outlines) outline.setMap(null);
    };
    // The list is redrawn when its mukims change, not when a new array holds the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, library, mukimKey]);

  function place(kind: "circle" | "square") {
    if (!map) return;
    const view = viewOf(map);
    if (!view) return;
    setTool("edit");
    editor.current?.setEditable(true);
    editor.current?.addPiece(
      kind === "circle"
        ? circleRing(view.center, view.size / 2)
        : squareRing(view.center, view.size),
    );
  }

  // Ctrl+Z undoes, and Ctrl+Shift+Z or Ctrl+Y redoes, with ⌘ on a Mac, as
  // the buttons do; not in a field being typed in, where they edit the text.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if ((key !== "z" && key !== "y") || typing(event.target)) return;
      event.preventDefault();
      if (key === "y" || event.shiftKey) {
        if (canRedo) onRedo();
      } else if (canUndo) onUndo();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canUndo, canRedo, onUndo, onRedo]);

  // Full screen comes and goes by the button or by the browser's own Esc.
  useEffect(() => {
    const follow = () =>
      setFull(
        wrapper.current !== null &&
          document.fullscreenElement === wrapper.current,
      );
    document.addEventListener("fullscreenchange", follow);
    return () => document.removeEventListener("fullscreenchange", follow);
  }, []);

  function toggleFullScreen() {
    // A browser that refuses leaves the page as it is.
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      wrapper.current?.requestFullscreen().catch(() => undefined);
    }
  }

  // An open menu takes the keyboard's focus, and closes on Escape or on a
  // press anywhere else.
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector("button")?.focus();
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof PointerEvent &&
        menuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setMenu(null);
    };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const hint = failed
    ? MAP_FAILURES[failed]
    : notice
      ? notice.message
      : !shape
        ? mukims
          ? "Tick a mukim above to start the zone."
          : canAdd
            ? "Move the map to the area, then add a square or a circle from the tools to reshape."
            : null
        : !editing
          ? "The hand only moves the map. Pick the pencil to edit the zone."
          : cutting
            ? "Click another corner of this piece to cut it in two along the line. Esc stops."
            : !selection
              ? "Click a piece to edit it. Drag anywhere else to move the map."
              : selection.corner
                ? "Drag the corner to move it. The bin removes it; the scissors cut the piece from it to another corner."
                : "Drag a corner, or inside the piece to move it alone. Drag a square of the box around it to grow or shrink it. Point at an edge and click the + to add a corner. Click a corner to select it. The bin deletes the piece.";

  return (
    <div
      ref={wrapper}
      className={cx("grid gap-2", full && "grid-rows-[1fr_auto] bg-white p-3")}
    >
      <div
        ref={host}
        role="application"
        aria-label="Map of the zone"
        className={cx(
          "w-full rounded-md border border-neutral-200 bg-neutral-100",
          full ? "h-full min-h-0" : "h-[32rem]",
        )}
      />
      {corner && map && document.fullscreenEnabled
        ? createPortal(
            <Tooltip
              content={full ? "Exit full screen" : "Full screen"}
              side="left"
            >
              <button
                type="button"
                aria-label={full ? "Exit full screen" : "Full screen"}
                onClick={toggleFullScreen}
                className="m-2.5 grid size-10 place-items-center rounded-sm bg-white text-neutral-600 shadow-[0_1px_4px_-1px_rgb(0_0_0/0.3)] hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900 [&_svg]:size-[18px]"
              >
                {full ? <MinimizeIcon /> : <MaximizeIcon />}
              </button>
            </Tooltip>,
            corner,
          )
        : null}
      {toolbar && map && (canAdd || canUndo || canRedo)
        ? createPortal(
            <div className="mb-6 flex items-center gap-0.5 rounded-lg border border-neutral-300 bg-white p-1 shadow-md">
              {shape ? (
                <>
                  <ToolButton
                    label="Edit the zone"
                    active={tool === "edit"}
                    onClick={() => setTool("edit")}
                  >
                    <PencilIcon />
                  </ToolButton>
                  <ToolButton
                    label="Only move the map"
                    active={tool === "pan"}
                    onClick={() => setTool("pan")}
                  >
                    <HandIcon />
                  </ToolButton>
                  <Divider />
                </>
              ) : null}
              {canAdd ? (
                <>
                  <ToolButton
                    label="Add a square"
                    onClick={() => place("square")}
                  >
                    <SquarePlusIcon />
                  </ToolButton>
                  <ToolButton
                    label="Add a circle"
                    onClick={() => place("circle")}
                  >
                    <CirclePlusIcon />
                  </ToolButton>
                  <Divider />
                </>
              ) : null}
              {shape ? (
                <>
                  <ToolButton
                    label="Cut the piece from the corner selected"
                    active={cutting}
                    disabled={!editing || !selection?.corner}
                    onClick={() => editor.current?.startCut()}
                  >
                    <ScissorsIcon />
                  </ToolButton>
                  <ToolButton
                    label={
                      selection?.corner
                        ? "Remove the corner selected"
                        : "Delete the piece selected"
                    }
                    disabled={!editing || !selection}
                    onClick={() => editor.current?.removeSelected()}
                  >
                    <TrashIcon />
                  </ToolButton>
                </>
              ) : null}
              <ToolButton label="Undo" disabled={!canUndo} onClick={onUndo}>
                <UndoIcon />
              </ToolButton>
              <ToolButton label="Redo" disabled={!canRedo} onClick={onRedo}>
                <RedoIcon />
              </ToolButton>
            </div>,
            toolbar,
          )
        : null}
      {menu && map
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Edit the zone"
              style={{ left: menu.x, top: menu.y }}
              onContextMenu={(event) => event.preventDefault()}
              className="absolute z-20 grid w-48 rounded-md border border-neutral-200 bg-white p-1 text-sm shadow-lg"
            >
              {menu.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    item.run();
                  }}
                  className={cx(
                    "rounded px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-neutral-900",
                    item.danger
                      ? "text-red-700 hover:bg-red-50"
                      : "text-neutral-800 hover:bg-neutral-100",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            map.getDiv(),
          )
        : null}
      <p
        role={notice ? "status" : undefined}
        className={cx(
          "min-h-4 text-xs",
          failed
            ? "text-red-700"
            : notice?.kind === "refused"
              ? "text-amber-800"
              : notice
                ? "text-emerald-800"
                : "text-neutral-500",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-neutral-200" />;
}

/** An icon button of the toolbar; `active` for a tool, which stays pressed while it is in hand. */
function ToolButton({
  label,
  active,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "grid size-9 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-35 [&_svg]:size-[18px]",
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-700 enabled:hover:bg-neutral-100",
      )}
    >
      {children}
    </button>
  );
}
