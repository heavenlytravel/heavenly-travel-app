"use client";

import Link from "next/link";
import {
  parseRinggit,
  plural,
  ringgitInputValue,
  type DropoffRule,
} from "@repo/db";
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
  ArrowRightToLineIcon,
  ArrowUpIcon,
  PlusIcon,
  XIcon,
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
import { locationTabHref } from "../../../../_lib/routes";
import { useLeaveGuard } from "../../../../_lib/use-leave-guard";
import { setZoneRatesAction } from "./actions";
import {
  AddRouteDialog,
  pairKey,
  type NewRoute,
  type ZoneElsewhere,
} from "./AddRouteDialog";
import { errorOf } from "../../../../_lib/action-state";

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

/**
 * A route's two zone columns stay in view while the classes scroll under
 * them, from `sm` up. Each is as wide as its longest name, so a name keeps
 * to one line and a row to one height; To is pinned at From's width, which
 * the grid measures into `--from-width`.
 */
const FROM_COLUMN = "sm:sticky sm:left-0";
const TO_COLUMN =
  "relative border-r border-slate-200 sm:sticky sm:left-[var(--from-width,0px)]";
/** A zone's name on one line, wrapping only past 15rem. */
const ZONE_NAME = "block w-max max-w-60 font-medium text-slate-900";

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
        "group/sort inline-flex items-center gap-1 rounded-sm font-medium hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-brand",
        align === "right" && "flex-row-reverse",
      )}
    >
      {label}
      <Arrow
        className={cx(
          "size-3",
          dir === null
            ? "text-slate-300 opacity-0 group-hover/sort:opacity-100"
            : "text-slate-900",
        )}
      />
    </button>
  );
}

/** A row's fill and remove buttons. */
const ROW_ACTION =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

const CELL_INPUT =
  "block h-10 w-full min-w-24 bg-transparent px-3 text-right text-sm tabular-nums outline-hidden placeholder:text-xs placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand focus:ring-inset read-only:cursor-wait";

/**
 * The rate grid, edited as a spreadsheet: a row per route, a column per
 * class on sale, grouped by category, a price in RM in each cell. The
 * arrow keys and Enter move between cells, a block copied from a
 * spreadsheet pastes into the grid from the cell it lands in, and a cell
 * that is not a price is marked. Changed cells are shaded until saved;
 * the bar at the foot counts them, saves them all at once or discards
 * them, and leaving the page with any unsaved asks first. "Add route"
 * opens a dialog that offers only the pairs of zones not on the grid yet,
 * so a route has one row whichever way it is read, and saves the route
 * with its prices at once. A route out of the location ends at another
 * location's zone, named with its location and marked one way (→), since
 * a trip back starts there and is priced there; the dialog offers those
 * zones unless drop-offs stay inside the location, when such a route is
 * marked not offered. What an empty cell means follows the drop-off rule:
 * metered, or not offered.
 *
 * A route's zones are two columns, From and To, pinned while the classes
 * scroll and the heading pinned while the routes do. The rows sort by
 * either zone or by a class's price, on the prices as saved, so a row
 * stays put while its cells are typed in and moves on the save. They can
 * be narrowed to the routes of one zone, that zone then read as From, or
 * to those with a class unpriced as saved. The keys and a paste follow
 * the rows as shown. A row's fill copies each category's first price
 * across its empty cells, and each class's heading counts its priced
 * routes.
 */
export function RateGrid({
  locationId,
  locationSlug,
  zones,
  elsewhere,
  classes,
  cells,
  rule,
  readOnly = false,
}: {
  locationId: string;
  /** The location's slug, its address, for the links to the other tabs. */
  locationSlug: string;
  zones: Zone[];
  /** Other locations' zones by name: where the routes out end, and where a new one may. */
  elsewhere: ZoneElsewhere[];
  classes: ClassColumn[];
  cells: Cell[];
  rule: DropoffRule;
  /** For the teams that read the rates: the prices as text, nothing to change. */
  readOnly?: boolean;
}) {
  const [saved, setSaved] = useState<Saved>(() => savedOf(cells, zones));
  const [routes, setRoutes] = useState<Route[]>(saved.routes);
  const [values, setValues] = useState(() => valuesOf(saved));
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sort, setSort] = useState<Sort>(null);
  /** The zone whose routes alone are shown, or "" for every route. */
  const [zoneShown, setZoneShown] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [pending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);
  // What the focused cell held when it took the focus, for Escape.
  const valueAtFocus = useRef("");
  // Whether classes are scrolled out of view on either side, for the
  // shadow at the route column and the fade at the right edge.
  const [hidden, setHidden] = useState({ left: false, right: false });

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      // A cell that takes the focus scrolls clear of the zone columns,
      // when they are pinned, and of the heading.
      const pinned = [...grid.querySelectorAll<HTMLElement>("th[data-pin]")]
        .slice(0, 2)
        .filter((th) => getComputedStyle(th).position === "sticky");
      grid.style.scrollPaddingLeft = `${pinned.reduce((sum, th) => sum + th.offsetWidth, 0)}px`;
      const from = grid.querySelector<HTMLElement>("th[data-pin]");
      grid.style.setProperty("--from-width", `${from?.offsetWidth ?? 0}px`);
      grid.style.scrollPaddingTop = `${grid.querySelector("thead")?.offsetHeight ?? 0}px`;
      const left = grid.scrollLeft > 1;
      const right = grid.scrollLeft + grid.clientWidth < grid.scrollWidth - 1;
      setHidden((was) =>
        was.left === left && was.right === right ? was : { left, right },
      );
    };
    // The observer reports once on observing, so the first measure is its.
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    if (grid.firstElementChild) observer.observe(grid.firstElementChild);
    // From widens and narrows with the names shown, the table's width aside.
    const from = grid.querySelector("th[data-pin]");
    if (from) observer.observe(from);
    grid.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      grid.removeEventListener("scroll", measure);
    };
  }, []);

  // The grid against what is saved: the cells changed, those that are not
  // prices, and the saved prices of rows taken off.
  const onGrid = new Set(routes.map(routeKey));
  const changed = new Set<string>();
  const invalid = new Set<string>();
  for (const route of routes) {
    for (const column of classes) {
      const key = cellKey(route, column.id);
      const reading = readCell(values[key]);
      if (!reading.ok) invalid.add(key);
      else if (reading.sen !== (saved.prices[key] ?? null)) changed.add(key);
    }
  }
  const removed = Object.keys(saved.prices).filter(
    (key) => !onGrid.has(routeKeyOfCell(key)),
  ).length;
  const changes = changed.size + invalid.size + removed;
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

  // What a row's fill writes: in each category, the first price typed
  // into the cells left empty.
  function fillOf(route: Route): Record<string, string> {
    const first = new Map<string, string>();
    for (const column of classes) {
      const text = values[cellKey(route, column.id)] ?? "";
      const reading = readCell(text);
      if (!first.has(column.category) && reading.ok && reading.sen !== null) {
        first.set(column.category, tidy(text));
      }
    }
    const fill: Record<string, string> = {};
    for (const column of classes) {
      const key = cellKey(route, column.id);
      const price = first.get(column.category);
      if (price !== undefined && (values[key] ?? "").trim() === "") {
        fill[key] = price;
      }
    }
    return fill;
  }

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
  // location's zones, and out to other locations' unless drop-offs stay in.
  const paired = new Set(
    routes.map((route) => pairKey(route.fromZoneId, route.toZoneId)),
  );
  const routesOut = routes.filter(isOut).length;
  const pairs = (zones.length * (zones.length - 1)) / 2;
  const freePairs = pairs - (routes.length - routesOut);
  const offered = rule === "zones" ? [] : elsewhere;
  const freeOut =
    zones.length * offered.length - (offered.length > 0 ? routesOut : 0);

  const coverageHref = locationTabHref(locationSlug, "coverage");
  if (
    zones.length === 0 ||
    (zones.length === 1 && offered.length === 0 && routes.length === 0)
  ) {
    return (
      <p className="border-t border-slate-200 px-6 py-5 text-sm text-slate-600">
        A route runs between two zones.{" "}
        {zones.length === 0 ? "Draw the zones" : "Draw a second zone"} on the{" "}
        <Link
          href={coverageHref}
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Coverage tab
        </Link>{" "}
        to put a route on the grid.
      </p>
    );
  }
  if (classes.length === 0) {
    return (
      <p className="border-t border-slate-200 px-6 py-5 text-sm text-slate-600">
        Each class on sale is a column of the grid. Put a class on sale on the{" "}
        <Link
          href={locationTabHref(locationSlug, "vehicle-classes")}
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Vehicle classes tab
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
  // as shown; what falls past
  // the grid's edge is left out and counted.
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
      `Added the route ${nameOf(a)} ${isOut(route) ? "→" : "↔"} ${nameOf(b)}.`,
    );
    return null;
  }

  function fillRow(route: Route, label: string) {
    const fill = fillOf(route);
    const count = Object.keys(fill).length;
    setValues((current) => ({ ...current, ...fill }));
    setNotice({
      tone: "info",
      text: `Filled ${plural(count, "cell")} of ${label}.`,
    });
  }

  function removeRoute(route: Route) {
    setNotice(null);
    setRoutes(routes.filter((r) => routeKey(r) !== routeKey(route)));
    setValues((current) => {
      const next = { ...current };
      for (const column of classes) delete next[cellKey(route, column.id)];
      return next;
    });
  }

  function discard() {
    setNotice(null);
    setRoutes(saved.routes);
    setValues(valuesOf(saved));
  }

  function save() {
    if (invalid.size > 0) return;
    // Every cell of the rows on the grid, and the saved prices of rows
    // taken off as cleared: the writer stores what changed.
    const rows: {
      fromZoneId: string;
      toZoneId: string;
      vehicleClassId: string;
      price: string;
    }[] = [];
    for (const route of routes) {
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
      for (const route of routes) {
        for (const column of classes) {
          const key = cellKey(route, column.id);
          const reading = readCell(values[key]);
          if (reading.ok && reading.sen !== null) prices[key] = reading.sen;
          else delete prices[key];
        }
      }
      const next = { routes, prices };
      setSaved(next);
      setValues(valuesOf(next));
      setNotice(null);
      toast.success("Rates saved.");
    });
  }

  const groups = groupsOf(classes);
  const grouped = groups.length > 1;
  const emptyMeans = rule === "grid" ? "not offered" : "metered";
  const toColumn = cx(
    TO_COLUMN,
    hidden.left && "sm:shadow-[6px_0_8px_-6px_rgb(0_0_0/0.15)]",
  );
  const ariaSortOf = (dir: 1 | -1 | null) =>
    dir === null ? undefined : dir === 1 ? "ascending" : "descending";
  const zoneHeading = (by: "from" | "to") => (
    <th
      key={by}
      data-pin=""
      scope="col"
      rowSpan={grouped ? 2 : undefined}
      aria-sort={ariaSortOf(dirOf(by))}
      className={cx(
        by === "from" ? cx(FROM_COLUMN, "pl-6") : cx(toColumn, "pl-9"),
        "z-1 border-b border-slate-200 bg-slate-50 py-2 pr-3 text-left align-bottom",
      )}
    >
      <SortHeading
        label={by === "from" ? "From" : "To"}
        dir={dirOf(by)}
        onSort={() => sortBy(by)}
      />
    </th>
  );
  const zoneHeadings = [zoneHeading("from"), zoneHeading("to")];
  // A class's priced routes, as typed.
  const pricedOf = (classId: string) =>
    routes.filter((route) => {
      const reading = readCell(values[cellKey(route, classId)]);
      return reading.ok && reading.sen !== null;
    }).length;
  const gaps = routes.filter(hasGap).length;

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

  return (
    <>
      {routes.length > 1 ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 pb-4">
          <Select
            aria-label="Show the routes of one zone"
            value={zoneShown}
            onValueChange={setZoneShown}
            options={zoneOptions}
            className="w-full sm:w-64"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              checked={gapsOnly}
              onChange={(event) => setGapsOnly(event.target.checked)}
            />
            Only routes with an empty cell ({gaps})
            <InfoTip
              text={`A route where a class has no saved price, so the class is ${emptyMeans} on it. A row filled in stays until the save.`}
            />
          </label>
          {filtering ? (
            <p className="text-sm text-slate-500 tabular-nums sm:ml-auto">
              {shown.length} of {plural(routes.length, "route")} shown
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="relative">
        <div
          ref={gridRef}
          className="max-h-[70vh] overflow-auto overscroll-x-contain border-y border-slate-200"
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-2 bg-slate-50 text-xs text-slate-600">
              {grouped ? (
                <tr>
                  {zoneHeadings}
                  {groups.map((group, index) => (
                    <th
                      key={`${group.label}-${index}`}
                      scope="colgroup"
                      colSpan={group.span}
                      className={cx(
                        "border-b border-slate-200 px-3 pt-2 pb-1.5 text-center font-medium text-slate-500",
                        index > 0 && "border-l",
                      )}
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>
              ) : null}
              <tr>
                {grouped ? null : zoneHeadings}
                {classes.map((column, col) => (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSortOf(dirOf(column.id))}
                    className={cx(
                      "border-b border-slate-200 px-3 py-2 text-right align-bottom text-slate-800",
                      col > 0 && "border-l",
                    )}
                  >
                    <SortHeading
                      label={column.name}
                      dir={dirOf(column.id)}
                      align="right"
                      onSort={() => sortBy({ classId: column.id })}
                    />
                    {routes.length > 0 ? (
                      <span className="block font-normal whitespace-nowrap text-slate-500 tabular-nums">
                        {pricedOf(column.id)} of {routes.length} priced
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
                    colSpan={classes.length + 2}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    {routes.length > 0 ? (
                      <>
                        No route matches.{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setZoneShown("");
                            setGapsOnly(false);
                          }}
                          className="font-medium text-slate-900 underline-offset-4 hover:underline"
                        >
                          Show every route
                        </button>
                      </>
                    ) : rule === "grid" ? (
                      "No routes yet, so nothing can be booked here: this location serves only the routes on its grid."
                    ) : (
                      "No routes yet: every trip is metered at the class's rates."
                    )}
                  </td>
                </tr>
              ) : (
                shown.map((route, row) => {
                  const [a, b] = shownEndsOf(route);
                  const out = isOut(route);
                  const label = `${nameOf(a)} ${out ? "to" : "and"} ${nameOf(b)}`;
                  const last = row === shown.length - 1;
                  const fillable =
                    !readOnly && Object.keys(fillOf(route)).length > 0;
                  const pinned = cx(
                    "z-1 bg-white py-1.5 text-left align-middle font-normal group-hover:bg-slate-50",
                    !last && "border-b border-slate-200",
                  );
                  return (
                    <tr key={routeKey(route)} className="group">
                      <th
                        data-pin=""
                        scope="row"
                        className={cx(FROM_COLUMN, pinned, "pr-3 pl-6")}
                      >
                        <span className={ZONE_NAME}>{zoneNameOf(a)}</span>
                      </th>
                      <td
                        data-pin=""
                        className={cx(toColumn, pinned, "pr-2 pl-3")}
                      >
                        <div className="flex min-h-7 items-center gap-2">
                          <Tooltip
                            content={
                              out
                                ? "Trips from here only; a trip back is priced where it starts."
                                : "The same price both ways."
                            }
                          >
                            <span
                              aria-hidden="true"
                              className="w-4 shrink-0 text-center text-slate-400"
                            >
                              {out ? "→" : "↔"}
                            </span>
                          </Tooltip>
                          <span className="sr-only">{out ? "to" : "and"}</span>
                          <span className={ZONE_NAME}>{zoneNameOf(b)}</span>
                          {out ? (
                            <span className="flex shrink-0 gap-1">
                              <Badge>
                                {awayOf(route.toZoneId)?.location ??
                                  "Another location"}
                              </Badge>
                              {rule === "zones" ? (
                                <Tooltip content="Drop-offs stay inside this location, so this route is not offered. Change the drop-off rule to offer it.">
                                  <Badge tone="amber">Not offered</Badge>
                                </Tooltip>
                              ) : null}
                            </span>
                          ) : null}
                          {readOnly ? null : (
                            // Over the zone name while the row is hovered or
                            // a button has the focus, so the names keep the
                            // width; always shown on a touch screen.
                            <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 bg-slate-50 pr-2 pl-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                              {fillable ? (
                                <Tooltip content="Copy each category's first price into its empty cells">
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => fillRow(route, label)}
                                    aria-label={`Fill the empty cells of ${label}`}
                                    className={ROW_ACTION}
                                  >
                                    <ArrowRightToLineIcon />
                                  </button>
                                </Tooltip>
                              ) : null}
                              <Tooltip content="Remove route">
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => removeRoute(route)}
                                  aria-label={`Remove the route between ${label}`}
                                  className={ROW_ACTION}
                                >
                                  <XIcon />
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </td>
                      {classes.map((column, col) => {
                        const key = cellKey(route, column.id);
                        const bad = invalid.has(key);
                        return (
                          <td
                            key={column.id}
                            className={cx(
                              "border-slate-200 p-0",
                              col > 0 && "border-l",
                              !last && "border-b",
                              bad
                                ? "bg-red-50"
                                : changed.has(key)
                                  ? "bg-amber-50"
                                  : "group-hover:bg-slate-50",
                            )}
                          >
                            {readOnly ? (
                              <span
                                aria-label={`${label}, ${column.name}, price in RM`}
                                className="block h-10 min-w-24 px-3 text-right text-sm leading-10 tabular-nums"
                              >
                                {values[key] || (
                                  <span className="text-xs text-slate-400">
                                    {emptyMeans}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <input
                                data-cell={`${row}:${col}`}
                                aria-label={`${label}, ${column.name}, price in RM`}
                                aria-invalid={bad || undefined}
                                inputMode="decimal"
                                autoComplete="off"
                                spellCheck={false}
                                readOnly={pending}
                                placeholder={emptyMeans}
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
                                  bad && "text-red-700",
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
        {hidden.right ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-px right-0 w-12 bg-linear-to-l from-white to-transparent"
          />
        ) : null}
      </div>

      <div className="grid gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {readOnly ? (
            <span />
          ) : freePairs > 0 || freeOut > 0 ? (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setAdding(true)}
            >
              <PlusIcon />
              Add route
            </Button>
          ) : (
            <p className="text-sm text-slate-600">
              Every pair of zones has a row.
            </p>
          )}
          <p className="text-xs text-slate-500 tabular-nums">
            {[
              pairs > 0
                ? `${routes.length - routesOut} of ${plural(pairs, "pair")} of zones on the grid`
                : null,
              routesOut > 0
                ? `${plural(routesOut, "route")} out to other locations`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          {rule === "grid"
            ? "An empty cell means the class is not offered on that route."
            : "An empty cell is metered at the class's rates."}{" "}
          A route costs the same both ways
          {routesOut > 0 || offered.length > 0
            ? "; one out to another location's zone (→) prices trips from here only."
            : "."}{" "}
          Click a heading to sort by it.
          {readOnly
            ? null
            : " Paste a block of prices copied from a spreadsheet into any cell; Enter moves down a row, Escape undoes the cell."}
        </p>
      </div>

      {readOnly ? null : (
        <>
          {leaveDialog}
          <AddRouteDialog
            open={adding}
            onOpenChange={setAdding}
            zones={zones}
            elsewhere={offered}
            classes={classes}
            paired={paired}
            rule={rule}
            onAdd={addRoute}
          />

          <div className="sticky bottom-0 z-2 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur-sm">
            <p
              aria-live="polite"
              className={cx(
                "flex min-w-0 items-center gap-2 text-sm",
                status.tone === "error"
                  ? "text-red-700"
                  : status.tone === "done"
                    ? "text-emerald-700"
                    : status.tone === "idle"
                      ? "text-slate-500"
                      : "text-slate-800",
              )}
            >
              {status.tone === "dirty" ? (
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-sm border border-amber-300 bg-amber-50"
                />
              ) : null}
              {status.text}
            </p>
            <div className="flex items-center gap-2">
              {dirty ? (
                <Button variant="ghost" disabled={pending} onClick={discard}>
                  Discard
                </Button>
              ) : null}
              <Button
                disabled={pending || !dirty || invalid.size > 0}
                onClick={save}
              >
                {pending ? "Saving…" : "Save rates"}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
