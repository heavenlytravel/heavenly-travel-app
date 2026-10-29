"use client";

import Link from "next/link";
import { parseRinggit, plural, ringgitInputValue } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";
import { Tooltip } from "@repo/ui/tooltip";
import { cx } from "@repo/ui/cx";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
  UndoIcon,
} from "@repo/ui/icons";
import { toast } from "@repo/ui/toast";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { classesHref, coverageHref } from "../../../../_lib/routes";
import { useLeaveGuard } from "../../../../_lib/use-leave-guard";
import { setZoneRatesAction } from "./actions";
import {
  AddRouteDialog,
  pairKey,
  type NewRoute,
  type ZoneElsewhere,
} from "./AddRouteDialog";
import { errorOf } from "../../../../_lib/action-state";
import {
  CELL_BAD,
  CELL_CHANGED,
  CELL_DOOMED,
  CELL_INPUT,
  CELL_PAD,
  CELL_PLAIN,
  CellKey,
  EMPTY_CELL,
  EMPTY_CELL_MEANING,
} from "./cells";

type Zone = { id: string; name: string };
/** A column of the grid: a class on sale here, with the category it is sold under. */
type ClassColumn = { id: string; name: string; category: string };
type Cell = {
  fromZoneId: string;
  toZoneId: string;
  vehicleClassId: string;
  priceSen: number;
};
type Route = { fromZoneId: string; toZoneId: string };
/** The grid as last read or saved: its rows, and every price by cell, classes off sale included. */
type Saved = { routes: Route[]; prices: Record<string, number> };
/** What the bar at the foot says, besides the count of unsaved changes. */
type Notice = { tone: "error" | "done" | "info"; text: string };
/** The column the rows are sorted by: a zone end, or a class by its id; none keeps the zones' order. */
type Sort = { by: "from" | "to" | { classId: string }; dir: 1 | -1 } | null;

const routeKey = (route: Route) => `${route.fromZoneId}|${route.toZoneId}`;
const cellKey = (route: Route, classId: string) =>
  `${routeKey(route)}|${classId}`;
/** The route a cell's key names. */
const routeKeyOfCell = (key: string) => key.split("|").slice(0, 2).join("|");

/** What a cell holds: a price in sen, nothing, or text that is not a price. */
type Reading = { ok: true; sen: number | null } | { ok: false };

function readCell(text: string | undefined): Reading {
  const trimmed = (text ?? "").trim();
  if (trimmed === "") return { ok: true, sen: null };
  const sen = parseRinggit(trimmed);
  return sen === null ? { ok: false } : { ok: true, sen };
}

/** A value as the cell keeps it: "80" as "80.00", a lone dash as empty, anything else as typed. */
function tidy(text: string): string {
  const trimmed = text.trim();
  if (/^[-–—]$/.test(trimmed)) return "";
  const reading = readCell(trimmed);
  return reading.ok && reading.sen !== null
    ? ringgitInputValue(reading.sen)
    : trimmed;
}

/** The stored cells as the grid's rows and prices, the rows in the zones' order. */
function savedOf(cells: readonly Cell[], zones: readonly Zone[]): Saved {
  const seen = new Map<string, Route>();
  const prices: Record<string, number> = {};
  for (const cell of cells) {
    const route = { fromZoneId: cell.fromZoneId, toZoneId: cell.toZoneId };
    seen.set(routeKey(route), route);
    prices[cellKey(route, cell.vehicleClassId)] = cell.priceSen;
  }
  const rank = new Map(zones.map((zone, index) => [zone.id, index]));
  const ends = (route: Route) => {
    const a = rank.get(route.fromZoneId) ?? zones.length;
    const b = rank.get(route.toZoneId) ?? zones.length;
    return [Math.min(a, b), Math.max(a, b)] as const;
  };
  const routes = [...seen.values()].sort((x, y) => {
    const [x1, x2] = ends(x);
    const [y1, y2] = ends(y);
    return x1 - y1 || x2 - y2;
  });
  return { routes, prices };
}

function valuesOf(saved: Saved): Record<string, string> {
  return Object.fromEntries(
    Object.entries(saved.prices).map(([key, sen]) => [
      key,
      ringgitInputValue(sen),
    ]),
  );
}

/** Neighbouring columns of one category, for the heading row above the class names. */
function groupsOf(classes: readonly ClassColumn[]) {
  const groups: { label: string; span: number }[] = [];
  for (const column of classes) {
    const last = groups.at(-1);
    if (last && last.label === column.category) last.span += 1;
    else groups.push({ label: column.category, span: 1 });
  }
  return groups;
}

/** A zone's name cut to the column's width, whole in its tooltip. */
const ZONE_NAME = "block max-w-44 truncate font-medium text-ink";

/** A link in a line of the grid's text: to Coverage, to the classes. */
const TEXT_LINK = "font-semibold text-brand underline-offset-4 hover:underline";

const byName = (a: string, b: string) =>
  a.localeCompare(b, "en", { sensitivity: "base" });

/** The heading of a column the rows sort by, with its arrow while it does. */
function SortHeading({
  label,
  dir,
  align = "left",
  onSort,
}: {
  label: string;
  /** The way the rows sort by it, or none. */
  dir: 1 | -1 | null;
  align?: "left" | "right";
  onSort: () => void;
}) {
  const Arrow = dir === -1 ? ArrowDownIcon : ArrowUpIcon;
  return (
    <button
      type="button"
      onClick={onSort}
      className={cx(
        "group/sort inline-flex items-center gap-1 rounded-sm font-semibold tracking-[0.05em] uppercase hover:text-ink focus-visible:outline-2 focus-visible:outline-brand",
        align === "right" && "flex-row-reverse",
      )}
    >
      {label}
      <Arrow
        className={cx(
          "size-3",
          dir === null
            ? "text-muted opacity-0 group-hover/sort:opacity-100"
            : "text-ink",
        )}
      />
    </button>
  );
}

/**
 * The rate grid, edited as a spreadsheet: a row per route, a column per
 * class on sale, grouped by category, a price in RM in each cell. The
 * arrow keys and Enter move between cells, a block copied from a
 * spreadsheet pastes into the grid from the cell it lands in, and a cell
 * that is not a price is marked. Every cell is a box to type in, changed
 * ones tinted until saved and empty ones hatched; the save bar at the
 * grid's foot counts the changes, turning navy while there are any, saves
 * them all at once or discards them, and leaving the page with any
 * unsaved asks first. "Add route" opens a dialog that offers only the
 * pairs of zones not on the grid yet, so a route has one row whichever
 * way it is read, and saves the route with its prices at once. A zone
 * paired with itself is its within-zone price, "Within Kuah Town", first
 * in that zone's rows. A route out of the location ends at another
 * location's zone, named with its location and marked one way (→), since
 * a trip back starts there and is priced there; "Add route" offers those
 * zones too, by location, while cross-location is on, and while it is off
 * such a route is kept, marked not sold. An empty cell
 * is a class not offered on the route.
 *
 * A route's zones are two columns, From and To, their names cut short and
 * whole in a tooltip on hover or click; the heading stays in view while
 * the routes scroll. The rows sort by either zone or by a class's price,
 * on the prices as saved, so a row stays put while its cells are typed in
 * and moves on the save. They can be narrowed to the routes of one zone,
 * that zone then read as From, or to those with a class unpriced as
 * saved. The keys and a paste follow the rows as shown. Ticked rows are
 * marked for deletion: struck through, their prices locked, until the save
 * deletes them or their undo or Discard keeps them. On a computer the save
 * bar stays in view at the foot of the screen while the grid is; on a
 * phone it ends the grid. Each class's heading counts its priced routes.
 * Narrowed to a category, the grid holds that category's classes and
 * their prices alone: a route deleted there loses those prices only.
 */
export function RateGrid({
  locationId,
  locationSlug,
  zones,
  elsewhere,
  classes,
  cells,
  crossLocation,
  category,
  readOnly = false,
}: {
  locationId: string;
  /** The location's slug, its address, for the links to Coverage and the classes. */
  locationSlug: string;
  zones: Zone[];
  /** Other locations' zones by name: where the routes out end, and where a new one may. */
  elsewhere: ZoneElsewhere[];
  classes: ClassColumn[];
  cells: Cell[];
  /** Whether cross-location is on: the routes out are sold, and more may be added. */
  crossLocation: boolean;
  /** The category the columns are narrowed to, by name: "Coach charter"; none for every class on sale. */
  category?: string;
  /** For the teams that read the rates: the prices as text, nothing to change. */
  readOnly?: boolean;
}) {
  const [saved, setSaved] = useState<Saved>(() => savedOf(cells, zones));
  const [routes, setRoutes] = useState<Route[]>(saved.routes);
  const [values, setValues] = useState(() => valuesOf(saved));
  /** Whether "Add route" is open. */
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sort, setSort] = useState<Sort>(null);
  /** The zone whose routes alone are shown, or "" for every route. */
  const [zoneShown, setZoneShown] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  /** The ticked rows, by route key. */
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  /** The rows marked for deletion, by route key: deleted on the save. */
  const [doomed, setDoomed] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);
  // What the focused cell held when it took the focus, for Escape.
  const valueAtFocus = useRef("");
  // Whether classes are scrolled out of view on the right, for the fade.
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      // A cell that takes the focus scrolls clear of the heading.
      grid.style.scrollPaddingTop = `${grid.querySelector("thead")?.offsetHeight ?? 0}px`;
      setMoreRight(grid.scrollLeft + grid.clientWidth < grid.scrollWidth - 1);
    };
    // The observer reports once on observing, so the first measure is its.
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    if (grid.firstElementChild) observer.observe(grid.firstElementChild);
    grid.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      grid.removeEventListener("scroll", measure);
    };
  }, []);

  // The grid against what is saved: the cells changed and those that are
  // not prices on the routes kept, and the routes marked for deletion,
  // each counted once.
  const kept = routes.filter((route) => !doomed.has(routeKey(route)));
  const onGrid = new Set(kept.map(routeKey));
  const changed = new Set<string>();
  const invalid = new Set<string>();
  for (const route of kept) {
    for (const column of classes) {
      const key = cellKey(route, column.id);
      const reading = readCell(values[key]);
      if (!reading.ok) invalid.add(key);
      else if (reading.sen !== (saved.prices[key] ?? null)) changed.add(key);
    }
  }
  const changes = changed.size + invalid.size + doomed.size;
  const dirty = changes > 0;
  const leaveDialog = useLeaveGuard(
    dirty,
    "The prices changed since the last save are lost.",
  );

  // This location's zones first, then the other locations'.
  const rank = new Map(
    [...zones, ...elsewhere].map((zone, index) => [zone.id, index]),
  );
  const own = new Set(zones.map((zone) => zone.id));
  const awayOf = (id: string) =>
    elsewhere.find((candidate) => candidate.id === id);
  /** A zone's name as its row shows it; another location's has its location beside it. */
  const zoneNameOf = (id: string) =>
    zones.find((candidate) => candidate.id === id)?.name ??
    awayOf(id)?.name ??
    "A removed zone";
  /** A zone's name with its location's for another location's, as the labels and messages say it. */
  const nameOf = (id: string) => {
    const away = awayOf(id);
    return away ? `${away.name} · ${away.location}` : zoneNameOf(id);
  };
  /** Whether the route runs out of the location: its `to` is another location's zone. */
  const isOut = (route: Route) => !own.has(route.toZoneId);
  /** Whether the route is a zone's within-zone price: the zone at both ends. */
  const isWithin = (route: Route) => route.fromZoneId === route.toZoneId;
  /** A route's zones in the zones' order, whichever way it is stored. */
  const endsOf = (route: Route): [string, string] =>
    (rank.get(route.fromZoneId) ?? rank.size) <=
    (rank.get(route.toZoneId) ?? rank.size)
      ? [route.fromZoneId, route.toZoneId]
      : [route.toZoneId, route.fromZoneId];
  /** A route's zones as its row shows them: the zone narrowed to as From, unless the route runs out to it. */
  const shownEndsOf = (route: Route): [string, string] => {
    const [a, b] = endsOf(route);
    return b === zoneShown && !isOut(route) ? [b, a] : [a, b];
  };

  // The rows as shown: narrowed, then sorted on the saved prices so that
  // typing never moves a row, the zones' order breaking ties.
  const hasGap = (route: Route) =>
    classes.some(
      (column) => saved.prices[cellKey(route, column.id)] === undefined,
    );
  const touches = (route: Route) =>
    zoneShown === "" ||
    route.fromZoneId === zoneShown ||
    route.toZoneId === zoneShown;
  const narrowed = routes.filter(
    (route) => touches(route) && (!gapsOnly || hasGap(route)),
  );
  const filtering = zoneShown !== "" || gapsOnly;
  const shown = sort ? [...narrowed].sort(compareRoutes(sort)) : narrowed;

  function compareRoutes({ by, dir }: NonNullable<Sort>) {
    return (x: Route, y: Route) => {
      if (by === "from" || by === "to") {
        const [x1, x2] = shownEndsOf(x).map(nameOf);
        const [y1, y2] = shownEndsOf(y).map(nameOf);
        return by === "from"
          ? dir * (byName(x1 ?? "", y1 ?? "") || byName(x2 ?? "", y2 ?? ""))
          : dir * (byName(x2 ?? "", y2 ?? "") || byName(x1 ?? "", y1 ?? ""));
      }
      // An unpriced cell sorts last whichever the way.
      const p = saved.prices[cellKey(x, by.classId)];
      const q = saved.prices[cellKey(y, by.classId)];
      if (p === undefined || q === undefined) {
        return p === q ? 0 : p === undefined ? 1 : -1;
      }
      return dir * (p - q);
    };
  }

  /** The way the rows sort by a column, or none. */
  const dirOf = (by: string) =>
    sort &&
    (typeof sort.by === "string" ? sort.by === by : sort.by.classId === by)
      ? sort.dir
      : null;
  /** Up, down, then back to the zones' order. */
  function sortBy(by: NonNullable<Sort>["by"]) {
    const dir = dirOf(typeof by === "string" ? by : by.classId);
    setSort(dir === null ? { by, dir: 1 } : dir === 1 ? { by, dir: -1 } : null);
  }

  // The ticked rows among those shown and kept: a narrowing unticks the
  // rest.
  const tickable = shown.filter((route) => !doomed.has(routeKey(route)));
  const tickedShown = tickable.filter((route) => ticked.has(routeKey(route)));

  // The zones a row can be narrowed to: this location's, then the other
  // locations' that a route runs out to.
  const zoneOptions = [
    { value: "", label: "Every zone" },
    ...zones.map((zone) => ({ value: zone.id, label: zone.name })),
    ...elsewhere
      .filter((zone) => routes.some((route) => route.toZoneId === zone.id))
      .map((zone) => ({ value: zone.id, label: nameOf(zone.id) })),
  ];

  // The pairs not on the grid yet, for "Add route": between this
  // location's zones, each with itself, and out to other locations' while
  // cross-location is on.
  const paired = new Set(
    routes.map((route) => pairKey(route.fromZoneId, route.toZoneId)),
  );
  const routesOut = routes.filter(isOut).length;
  const pairs = (zones.length * (zones.length + 1)) / 2;
  const freePairs = pairs - (routes.length - routesOut);
  const freeOut = crossLocation
    ? zones.length * elsewhere.length - routesOut
    : 0;

  if (zones.length === 0) {
    return (
      <p className="px-5 py-5 text-sm text-muted">
        A route runs between two zones, or within one. Draw the zones on{" "}
        <Link href={coverageHref(locationSlug)} className={TEXT_LINK}>
          Coverage
        </Link>{" "}
        to put a route on the grid.
      </p>
    );
  }
  if (classes.length === 0) {
    return (
      <p className="px-5 py-5 text-sm text-muted">
        {category
          ? `No ${category.toLowerCase()} class is on sale here. `
          : "Each class on sale is a column of the grid. "}
        Put a class on sale in{" "}
        <Link href={classesHref(locationSlug)} className={TEXT_LINK}>
          Classes
        </Link>{" "}
        to price a route for it.
      </p>
    );
  }

  function edit(key: string, text: string) {
    setNotice(null);
    setValues((current) => ({ ...current, [key]: text }));
  }

  function focusCell(row: number, col: number) {
    const input = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-cell="${row}:${col}"]`,
    );
    input?.focus();
    input?.select();
  }

  function onCellKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number,
    key: string,
  ) {
    const input = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = input;
    const whole = start === 0 && end === value.length;
    const move = (toRow: number, toCol: number) => {
      event.preventDefault();
      focusCell(toRow, toCol);
    };
    switch (event.key) {
      case "Enter":
        move(event.shiftKey ? row - 1 : row + 1, col);
        break;
      case "ArrowDown":
        move(row + 1, col);
        break;
      case "ArrowUp":
        move(row - 1, col);
        break;
      case "ArrowLeft":
        if (whole || (start === 0 && end === 0)) move(row, col - 1);
        break;
      case "ArrowRight":
        if (whole || (start === value.length && end === value.length)) {
          move(row, col + 1);
        }
        break;
      case "Escape":
        event.preventDefault();
        edit(key, valueAtFocus.current);
        requestAnimationFrame(() => input.select());
        break;
    }
  }

  // A block copied from a spreadsheet: tab between cells, a line per row.
  // It fills right and down from the cell it is pasted in, along the rows
  // as shown, past the rows marked for deletion; what falls past the
  // grid's edge is left out and counted.
  function onCellPaste(
    event: ClipboardEvent<HTMLInputElement>,
    row: number,
    col: number,
  ) {
    const text = event.clipboardData.getData("text/plain");
    if (!/[\t\n]/.test(text.trim())) return;
    event.preventDefault();
    const lines = text
      .replace(/\r/g, "")
      .replace(/\n+$/, "")
      .split("\n")
      .map((line) => line.split("\t"));
    const pasted: Record<string, string> = {};
    let filled = 0;
    let outside = 0;
    lines.forEach((line, i) =>
      line.forEach((raw, j) => {
        const route = shown[row + i];
        const column = classes[col + j];
        if (!route || !column) {
          outside += 1;
          return;
        }
        if (doomed.has(routeKey(route))) return;
        pasted[cellKey(route, column.id)] = tidy(raw);
        filled += 1;
      }),
    );
    setValues((current) => ({ ...current, ...pasted }));
    setNotice({
      tone: "info",
      text:
        outside > 0
          ? `Pasted ${plural(filled, "cell")}; ${plural(outside, "value")} fell outside the grid and ${outside === 1 ? "was" : "were"} left out.`
          : `Pasted ${plural(filled, "cell")}.`,
    });
  }

  // A route from the dialog is saved at once, with its prices, and joins
  // the grid as saved; the grid's other changes stay as they were.
  async function addRoute(added: NewRoute): Promise<string | null> {
    const route = { fromZoneId: added.fromZoneId, toZoneId: added.toZoneId };
    const refused = errorOf(
      await answerOf(
        setZoneRatesAction(
          locationId,
          classes.map((column) => ({
            ...route,
            vehicleClassId: column.id,
            price: added.prices[column.id] ?? "",
          })),
        ),
      ),
    );
    if (refused) return refused;
    const stored: Record<string, number> = {};
    for (const column of classes) {
      const reading = readCell(added.prices[column.id]);
      if (reading.ok && reading.sen !== null) {
        stored[cellKey(route, column.id)] = reading.sen;
      }
    }
    const withRoute = (prices: Record<string, number>) => {
      const next = { ...prices };
      for (const column of classes) delete next[cellKey(route, column.id)];
      return { ...next, ...stored };
    };
    setSaved((was) => ({
      routes: was.routes.some((r) => routeKey(r) === routeKey(route))
        ? was.routes
        : [...was.routes, route],
      prices: withRoute(was.prices),
    }));
    setRoutes((was) => [...was, route]);
    setValues((was) => ({
      ...was,
      ...Object.fromEntries(
        Object.entries(stored).map(([key, sen]) => [
          key,
          ringgitInputValue(sen),
        ]),
      ),
    }));
    setAdding(false);
    const [a, b] = endsOf(route);
    setNotice(null);
    toast.success(
      isWithin(route)
        ? `Added the route within ${nameOf(a)}.`
        : `Added the route ${nameOf(a)} ${isOut(route) ? "→" : "↔"} ${nameOf(b)}.`,
    );
    return null;
  }

  function narrowTo(zone: string, gaps: boolean) {
    setZoneShown(zone);
    setGapsOnly(gaps);
    setTicked(new Set());
  }

  function tick(route: Route, on: boolean) {
    setTicked((was) => {
      const next = new Set(was);
      if (on) next.add(routeKey(route));
      else next.delete(routeKey(route));
      return next;
    });
  }

  // Marked, not taken off: the row stays, struck through, until the save
  // deletes it; its undo or Discard keeps it.
  function deleteTicked() {
    setDoomed(new Set([...doomed, ...tickedShown.map(routeKey)]));
    setTicked(new Set());
    setNotice(null);
  }

  function keep(route: Route) {
    setDoomed((was) => {
      const next = new Set(was);
      next.delete(routeKey(route));
      return next;
    });
  }

  function discard() {
    setNotice(null);
    setRoutes(saved.routes);
    setValues(valuesOf(saved));
    setTicked(new Set());
    setDoomed(new Set());
  }

  function save() {
    if (invalid.size > 0) return;
    // Every cell of the rows kept, and the saved prices of the rows marked
    // for deletion as cleared: the writer stores what changed.
    const rows: {
      fromZoneId: string;
      toZoneId: string;
      vehicleClassId: string;
      price: string;
    }[] = [];
    for (const route of kept) {
      for (const column of classes) {
        rows.push({
          ...route,
          vehicleClassId: column.id,
          price: values[cellKey(route, column.id)] ?? "",
        });
      }
    }
    for (const key of Object.keys(saved.prices)) {
      if (onGrid.has(routeKeyOfCell(key))) continue;
      const [fromZoneId = "", toZoneId = "", vehicleClassId = ""] =
        key.split("|");
      rows.push({ fromZoneId, toZoneId, vehicleClassId, price: "" });
    }
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(setZoneRatesAction(locationId, rows)),
      );
      if (refused) {
        setNotice({ tone: "error", text: refused });
        return;
      }
      // What was just saved is what the next changes count from: the
      // prices of classes off sale on the rows kept, and the grid's own.
      const prices: Record<string, number> = {};
      for (const [key, sen] of Object.entries(saved.prices)) {
        if (onGrid.has(routeKeyOfCell(key))) prices[key] = sen;
      }
      for (const route of kept) {
        for (const column of classes) {
          const key = cellKey(route, column.id);
          const reading = readCell(values[key]);
          if (reading.ok && reading.sen !== null) prices[key] = reading.sen;
          else delete prices[key];
        }
      }
      const next = { routes: kept, prices };
      setSaved(next);
      setRoutes(kept);
      setValues(valuesOf(next));
      setTicked(new Set());
      setDoomed(new Set());
      setNotice(null);
      toast.success("Rates saved.");
    });
  }

  const groups = groupsOf(classes);
  const grouped = groups.length > 1;
  const emptyMeans = EMPTY_CELL_MEANING;
  const ariaSortOf = (dir: 1 | -1 | null) =>
    dir === null ? undefined : dir === 1 ? "ascending" : "descending";
  const allTicked =
    tickable.length > 0 && tickedShown.length === tickable.length;
  const tickHeading = readOnly ? null : (
    <th
      key="tick"
      scope="col"
      rowSpan={grouped ? 2 : undefined}
      className="w-px border-b border-hairline py-2.5 pr-1 pl-5 text-left align-bottom"
    >
      <Checkbox
        aria-label="Tick every route shown"
        checked={allTicked}
        disabled={tickable.length === 0}
        ref={(input) => {
          if (input) {
            input.indeterminate = tickedShown.length > 0 && !allTicked;
          }
        }}
        onChange={(event) =>
          setTicked(new Set(event.target.checked ? tickable.map(routeKey) : []))
        }
      />
    </th>
  );
  const zoneHeading = (by: "from" | "to") => (
    <th
      key={by}
      scope="col"
      rowSpan={grouped ? 2 : undefined}
      aria-sort={ariaSortOf(dirOf(by))}
      className={cx(
        "border-b border-hairline py-2.5 text-left align-bottom",
        by === "from" ? (readOnly ? "pr-3 pl-5" : "px-3") : "pr-3 pl-9",
      )}
    >
      <SortHeading
        label={by === "from" ? "From" : "To"}
        dir={dirOf(by)}
        onSort={() => sortBy(by)}
      />
    </th>
  );
  const leadHeadings = [tickHeading, zoneHeading("from"), zoneHeading("to")];
  // A class's priced routes, as typed, among those kept.
  const pricedOf = (classId: string) =>
    kept.filter((route) => {
      const reading = readCell(values[cellKey(route, classId)]);
      return reading.ok && reading.sen !== null;
    }).length;
  const gaps = kept.filter(hasGap).length;

  let status: { tone: Notice["tone"] | "dirty" | "idle"; text: string };
  if (pending) status = { tone: "idle", text: "Saving…" };
  else if (notice?.tone === "error") status = notice;
  else if (invalid.size > 0) {
    status = {
      tone: "error",
      text: `${invalid.size === 1 ? "One cell is" : `${invalid.size} cells are`} not a price. Enter RM with at most two decimals, or clear ${invalid.size === 1 ? "it" : "them"}.`,
    };
  } else if (dirty) {
    status = {
      tone: "dirty",
      text: `${notice?.tone === "info" ? `${notice.text} ` : ""}${plural(changes, "unsaved change")}.`,
    };
  } else if (notice) status = notice;
  else status = { tone: "idle", text: "No unsaved changes." };

  const canAdd = freePairs + freeOut > 0;
  const ticks = tickedShown.length;

  const narrowing = routes.length > 1;

  return (
    <>
      {readOnly && !narrowing ? null : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-hairline px-5 py-3">
          {readOnly ? null : (
            <div className="flex items-center gap-2">
              <Tooltip
                content={canAdd ? null : "Every pair of zones has a row."}
              >
                <Button
                  variant="secondary"
                  disabled={pending || !canAdd}
                  onClick={() => setAdding(true)}
                >
                  <PlusIcon />
                  Add route
                </Button>
              </Tooltip>
              <Tooltip
                content={ticks === 0 ? "Tick the routes to delete." : null}
              >
                <Button
                  variant="secondary"
                  disabled={pending || ticks === 0}
                  onClick={deleteTicked}
                >
                  <TrashIcon />
                  {ticks > 0 ? `Delete ${plural(ticks, "route")}` : "Delete"}
                </Button>
              </Tooltip>
            </div>
          )}
          {narrowing ? (
            <>
              <Select
                aria-label="Show the routes of one zone"
                value={zoneShown}
                onValueChange={(zone) => narrowTo(zone, gapsOnly)}
                options={zoneOptions}
                className="w-full sm:w-64"
              />
              <label className="flex items-center gap-2 text-sm text-body">
                <Checkbox
                  checked={gapsOnly}
                  onChange={(event) =>
                    narrowTo(zoneShown, event.target.checked)
                  }
                />
                Only routes with an empty cell ({gaps})
                <InfoTip text="A route where a class has no saved price. A row filled in stays until the save." />
              </label>
              {filtering ? (
                <p className="text-sm text-muted tabular-nums sm:ml-auto">
                  {shown.length} of {plural(routes.length, "route")} shown
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      )}
      <div className="relative">
        <div
          ref={gridRef}
          className="max-h-[70vh] overflow-auto overscroll-x-contain border-b border-hairline"
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-2 bg-shade text-[11px] text-muted">
              {grouped ? (
                <tr>
                  {leadHeadings}
                  {groups.map((group, index) => (
                    <th
                      key={`${group.label}-${index}`}
                      scope="colgroup"
                      colSpan={group.span}
                      className="px-1.5 pt-2.5 pb-0 font-semibold"
                    >
                      <span className="block border-b border-edge pb-1.5 text-center tracking-[0.05em] whitespace-nowrap text-body uppercase">
                        {group.label}
                      </span>
                    </th>
                  ))}
                </tr>
              ) : null}
              <tr>
                {grouped ? null : leadHeadings}
                {classes.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSortOf(dirOf(column.id))}
                    className="border-b border-hairline px-3 py-2.5 text-right align-bottom text-body"
                  >
                    <SortHeading
                      label={column.name}
                      dir={dirOf(column.id)}
                      align="right"
                      onSort={() => sortBy({ classId: column.id })}
                    />
                    {routes.length > 0 ? (
                      <span className="block font-normal whitespace-nowrap text-muted tabular-nums">
                        {pricedOf(column.id)} of {kept.length} priced
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td
                    colSpan={classes.length + (readOnly ? 2 : 3)}
                    className="px-5 py-10 text-center text-muted"
                  >
                    {routes.length > 0 ? (
                      <>
                        No route matches.{" "}
                        <button
                          type="button"
                          onClick={() => narrowTo("", false)}
                          className={TEXT_LINK}
                        >
                          Show every route
                        </button>
                      </>
                    ) : (
                      "No routes yet, so no one-way trip can be priced here: every trip is priced from the grid."
                    )}
                  </td>
                </tr>
              ) : (
                shown.map((route, row) => {
                  const [a, b] = shownEndsOf(route);
                  const out = isOut(route);
                  const within = isWithin(route);
                  const label = within
                    ? `within ${nameOf(a)}`
                    : `${nameOf(a)} ${out ? "to" : "and"} ${nameOf(b)}`;
                  const whole = within
                    ? `Within ${nameOf(a)}: a trip that starts and ends in it, or maps to it at both ends.`
                    : out
                      ? `${nameOf(a)} → ${nameOf(b)}: trips from here only; a trip back is priced where it starts.`
                      : `${nameOf(a)} ↔ ${nameOf(b)}, the same price both ways.`;
                  const isTicked = ticked.has(routeKey(route));
                  const isDoomed = doomed.has(routeKey(route));
                  // The row's shade, the same in every cell of it.
                  const shade = isDoomed
                    ? "bg-red-50/70"
                    : isTicked
                      ? "bg-shade"
                      : "group-hover:bg-hover";
                  const line =
                    row < shown.length - 1 && "border-b border-hairline";
                  const lead = cx(
                    "py-0 text-left align-middle font-normal",
                    shade,
                    isDoomed && "text-muted line-through",
                    line,
                  );
                  return (
                    <tr key={routeKey(route)} className="group">
                      {readOnly ? null : (
                        <td className={cx(lead, "w-px pr-1 pl-5")}>
                          {isDoomed ? (
                            <Tooltip content="Keep this route">
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => keep(route)}
                                aria-label={`Keep the route between ${label}`}
                                className="-m-1 inline-flex size-6 items-center justify-center rounded-md text-muted hover:bg-red-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                              >
                                <UndoIcon className="size-3.5" />
                              </button>
                            </Tooltip>
                          ) : (
                            <Checkbox
                              aria-label={`Tick the route between ${label}`}
                              checked={isTicked}
                              onChange={(event) =>
                                tick(route, event.target.checked)
                              }
                            />
                          )}
                        </td>
                      )}
                      <th
                        scope="row"
                        className={cx(lead, readOnly ? "pr-3 pl-5" : "px-3")}
                      >
                        <Tooltip content={whole} openOnClick>
                          <span
                            className={cx(
                              ZONE_NAME,
                              isDoomed && "text-muted line-through",
                            )}
                          >
                            {zoneNameOf(a)}
                          </span>
                        </Tooltip>
                      </th>
                      <td className={cx(lead, "pr-3")}>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="w-4 shrink-0 text-center text-muted"
                          >
                            {within ? "↺" : out ? "→" : "↔"}
                          </span>
                          {within ? (
                            <span
                              className={cx(
                                "text-muted italic",
                                isDoomed && "line-through",
                              )}
                            >
                              Within the zone
                            </span>
                          ) : (
                            <>
                              <span className="sr-only">
                                {out ? "to" : "and"}
                              </span>
                              <Tooltip
                                content={whole}
                                openOnClick
                                className="min-w-0"
                              >
                                <span
                                  className={cx(
                                    ZONE_NAME,
                                    isDoomed && "text-muted line-through",
                                  )}
                                >
                                  {zoneNameOf(b)}
                                </span>
                              </Tooltip>
                            </>
                          )}
                          {out ? (
                            <Badge>
                              {awayOf(route.toZoneId)?.location ??
                                "Another location"}
                            </Badge>
                          ) : null}
                          {out && !crossLocation ? (
                            <Tooltip content="Trips stay in this location, so this route is not sold. Turn on trips across locations, on Trip rules, to sell it again.">
                              <Badge tone="amber">
                                Not sold while trips stay in this location
                              </Badge>
                            </Tooltip>
                          ) : null}
                        </span>
                      </td>
                      {classes.map((column, col) => {
                        const key = cellKey(route, column.id);
                        const bad = invalid.has(key);
                        const empty = !(values[key] ?? "").trim();
                        return (
                          <td
                            key={column.id}
                            className={cx(CELL_PAD, shade, line)}
                          >
                            {readOnly ? (
                              <span
                                aria-label={`${label}, ${column.name}, ${empty ? emptyMeans.toLowerCase() : "price in RM"}`}
                                className={cx(
                                  "block h-9 min-w-24 rounded-lg px-2.5 text-right text-sm leading-9 text-ink tabular-nums",
                                  empty && EMPTY_CELL,
                                )}
                              >
                                {values[key]}
                              </span>
                            ) : (
                              <input
                                data-cell={`${row}:${col}`}
                                aria-label={`${label}, ${column.name}, price in RM`}
                                aria-invalid={bad || undefined}
                                inputMode="decimal"
                                autoComplete="off"
                                spellCheck={false}
                                readOnly={pending || isDoomed}
                                tabIndex={isDoomed ? -1 : undefined}
                                value={values[key] ?? ""}
                                onChange={(event) =>
                                  edit(key, event.target.value)
                                }
                                onFocus={(event) => {
                                  valueAtFocus.current = event.target.value;
                                  event.target.select();
                                }}
                                onBlur={(event) => {
                                  const text = tidy(event.target.value);
                                  if (text !== event.target.value)
                                    edit(key, text);
                                }}
                                onKeyDown={(event) =>
                                  onCellKeyDown(event, row, col, key)
                                }
                                onPaste={(event) =>
                                  onCellPaste(event, row, col)
                                }
                                className={cx(
                                  CELL_INPUT,
                                  isDoomed
                                    ? CELL_DOOMED
                                    : bad
                                      ? CELL_BAD
                                      : changed.has(key)
                                        ? CELL_CHANGED
                                        : cx(CELL_PLAIN, empty && EMPTY_CELL),
                                )}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {moreRight ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-px right-0 w-12 bg-linear-to-l from-white to-transparent"
          />
        ) : null}
      </div>

      <div className="grid gap-2 px-5 py-4 text-xs text-muted">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <CellKey swatch={cx("border-edge", EMPTY_CELL)}>{emptyMeans}</CellKey>
          {readOnly ? null : (
            <>
              <CellKey swatch="border-brand bg-brand-tint">
                Changed, not saved
              </CellKey>
              <CellKey swatch="border-red-200 bg-red-50">
                Deleted on save
              </CellKey>
            </>
          )}
          <span className="tabular-nums sm:ml-auto">
            {[
              pairs > 0
                ? `${routes.length - routesOut} of ${plural(pairs, "route")} between and within the zones on the grid`
                : null,
              routesOut > 0
                ? `${plural(routesOut, "route")} out to other locations`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
          </span>
        </p>
        <p className="leading-relaxed">
          A route costs the same both ways, and one within a zone (↺) prices the
          trips that start and end in it
          {routesOut > 0 || crossLocation
            ? "; one out to another location's zone (→) prices trips from here only."
            : "."}{" "}
          Click a heading to sort by it, a cut-short name to read it whole.
          {readOnly
            ? null
            : " Paste a block of prices copied from a spreadsheet into any cell; Enter moves down a row, Escape undoes the cell."}
        </p>
      </div>

      {readOnly ? null : (
        <>
          {/* Held at the screen's foot on a computer while the grid is in
              view; on a phone it ends the grid, as a form's button does. */}
          <div
            className={cx(
              "z-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-card px-5 py-3 md:sticky md:bottom-0",
              dirty
                ? "bg-navy text-white shadow-band"
                : "border-t border-hairline bg-white",
            )}
          >
            <p
              aria-live="polite"
              className={cx(
                "min-w-0 text-sm",
                status.tone === "error"
                  ? dirty
                    ? "font-semibold text-red-200"
                    : "text-red-700"
                  : dirty
                    ? "font-semibold"
                    : status.tone === "done"
                      ? "text-emerald-700"
                      : status.tone === "idle"
                        ? "text-muted"
                        : "text-body",
              )}
            >
              {status.text}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {dirty ? (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={discard}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  Discard
                </Button>
              ) : null}
              <Button
                variant={dirty ? "secondary" : "primary"}
                disabled={pending || !dirty || invalid.size > 0}
                onClick={save}
              >
                {pending ? "Saving…" : "Save rates"}
              </Button>
            </div>
          </div>
          {leaveDialog}
          <AddRouteDialog
            open={adding}
            onOpenChange={setAdding}
            zones={zones}
            elsewhere={crossLocation ? elsewhere : []}
            classes={classes}
            paired={paired}
            onAdd={addRoute}
          />
        </>
      )}
    </>
  );
}
