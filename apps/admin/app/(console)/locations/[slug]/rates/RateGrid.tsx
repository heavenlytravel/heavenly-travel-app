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
import { Tooltip } from "@repo/ui/tooltip";
import { cx } from "@repo/ui/cx";
import { PlusIcon, XIcon } from "@repo/ui/icons";
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

/** The route column stays in view while the classes scroll under it. */
const STICKY = "sticky left-0 z-1 border-r border-neutral-200";

const CELL_INPUT =
  "block h-10 w-full min-w-24 bg-transparent px-3 text-right text-sm tabular-nums outline-hidden placeholder:text-xs placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:ring-inset read-only:cursor-wait";

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
 */
export function RateGrid({
  locationId,
  locationSlug,
  zones,
  elsewhere = [],
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
  elsewhere?: ZoneElsewhere[];
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
      // A cell that takes the focus scrolls clear of the route column.
      const routeColumn = grid.querySelector("th");
      grid.style.scrollPaddingLeft = `${routeColumn?.offsetWidth ?? 0}px`;
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
      <p className="border-t border-neutral-200 px-6 py-5 text-sm text-neutral-600">
        A route runs between two zones.{" "}
        {zones.length === 0 ? "Draw the zones" : "Draw a second zone"} on the{" "}
        <Link
          href={coverageHref}
          className="font-medium text-neutral-900 underline-offset-4 hover:underline"
        >
          Coverage tab
        </Link>{" "}
        to put a route on the grid.
      </p>
    );
  }
  if (classes.length === 0) {
    return (
      <p className="border-t border-neutral-200 px-6 py-5 text-sm text-neutral-600">
        Each class on sale is a column of the grid. Put a class on sale on the{" "}
        <Link
          href={locationTabHref(locationSlug, "vehicle-classes")}
          className="font-medium text-neutral-900 underline-offset-4 hover:underline"
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
  // It fills right and down from the cell it is pasted in; what falls past
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
        const route = routes[row + i];
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
  const sticky = cx(
    STICKY,
    hidden.left && "shadow-[6px_0_8px_-6px_rgb(0_0_0/0.15)]",
  );
  const routeHeading = (
    <th
      scope="col"
      rowSpan={grouped ? 2 : undefined}
      className={cx(
        sticky,
        "border-b bg-neutral-50 py-2 pr-3 pl-6 text-left align-bottom font-medium",
      )}
    >
      Route
    </th>
  );

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
      <div className="relative">
        <div
          ref={gridRef}
          className="overflow-x-auto border-y border-neutral-200"
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-600">
              {grouped ? (
                <tr>
                  {routeHeading}
                  {groups.map((group, index) => (
                    <th
                      key={`${group.label}-${index}`}
                      scope="colgroup"
                      colSpan={group.span}
                      className={cx(
                        "border-b border-neutral-200 px-3 pt-2 pb-1.5 text-center font-medium text-neutral-500",
                        index > 0 && "border-l",
                      )}
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>
              ) : null}
              <tr>
                {grouped ? null : routeHeading}
                {classes.map((column, col) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={cx(
                      "border-b border-neutral-200 px-3 py-2 text-right align-bottom font-medium text-neutral-800",
                      col > 0 && "border-l",
                    )}
                  >
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 ? (
                <tr>
                  <td
                    colSpan={classes.length + 1}
                    className="px-6 py-8 text-center text-neutral-500"
                  >
                    {rule === "grid"
                      ? "No routes yet, so nothing can be booked here: this location serves only the routes on its grid."
                      : "No routes yet: every trip is metered at the class's rates."}
                  </td>
                </tr>
              ) : (
                routes.map((route, row) => {
                  const [a, b] = endsOf(route);
                  const out = isOut(route);
                  const arrow = out ? "→" : "↔";
                  const label = `${nameOf(a)} ${out ? "to" : "and"} ${nameOf(b)}`;
                  const last = row === routes.length - 1;
                  return (
                    <tr key={routeKey(route)} className="group">
                      <th
                        scope="row"
                        className={cx(
                          sticky,
                          "bg-white py-0 pr-2 pl-6 text-left font-normal group-hover:bg-neutral-50",
                          !last && "border-b",
                        )}
                      >
                        {/* One line from `sm` up; on a phone the two zones stack, so the prices keep the width. */}
                        <div className="flex min-h-10 items-center gap-2 py-1.5 sm:py-0">
                          <Tooltip
                            content={
                              out
                                ? `${nameOf(a)} → ${nameOf(b)}: trips from here only; a trip back is priced where it starts.`
                                : `${nameOf(a)} ↔ ${nameOf(b)}`
                            }
                            className="min-w-0 flex-1"
                          >
                            <span className="min-w-0 flex-1 font-medium text-neutral-900 sm:block sm:max-w-64 sm:truncate">
                              <span className="block max-w-32 truncate sm:inline sm:max-w-none">
                                {zoneNameOf(a)}
                              </span>
                              <span
                                aria-hidden="true"
                                className="mx-1.5 hidden text-neutral-400 sm:inline"
                              >
                                {arrow}
                              </span>
                              <span className="sr-only">
                                {out ? " to " : " and "}
                              </span>
                              <span className="block max-w-32 truncate sm:inline sm:max-w-none">
                                {zoneNameOf(b)}
                              </span>
                            </span>
                          </Tooltip>
                          {out ? (
                            <Badge>
                              {awayOf(route.toZoneId)?.location ??
                                "Another location"}
                            </Badge>
                          ) : null}
                          {out && rule === "zones" ? (
                            <Tooltip content="Drop-offs stay inside this location, so this route is not offered. Change the drop-off rule to offer it.">
                              <Badge tone="amber">Not offered</Badge>
                            </Tooltip>
                          ) : null}
                          {readOnly ? null : (
                            <Tooltip content="Remove route">
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => removeRoute(route)}
                                aria-label={`Remove the route between ${label}`}
                                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900 disabled:opacity-50"
                              >
                                <XIcon />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </th>
                      {classes.map((column, col) => {
                        const key = cellKey(route, column.id);
                        const bad = invalid.has(key);
                        return (
                          <td
                            key={column.id}
                            className={cx(
                              "border-neutral-200 p-0",
                              col > 0 && "border-l",
                              !last && "border-b",
                              bad
                                ? "bg-red-50"
                                : changed.has(key)
                                  ? "bg-amber-50"
                                  : "group-hover:bg-neutral-50",
                            )}
                          >
                            {readOnly ? (
                              <span
                                aria-label={`${label}, ${column.name}, price in RM`}
                                className="block h-10 min-w-24 px-3 text-right text-sm leading-10 tabular-nums"
                              >
                                {values[key] || (
                                  <span className="text-xs text-neutral-400">
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
            <p className="text-sm text-neutral-600">
              Every pair of zones has a row.
            </p>
          )}
          <p className="text-xs text-neutral-500 tabular-nums">
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
        <p className="text-xs leading-relaxed text-neutral-500">
          {rule === "grid"
            ? "An empty cell means the class is not offered on that route."
            : "An empty cell is metered at the class's rates."}{" "}
          A route costs the same both ways
          {routesOut > 0 || offered.length > 0
            ? "; one out to another location's zone (→) prices trips from here only."
            : "."}
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

          <div className="sticky bottom-0 z-2 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur-sm">
            <p
              aria-live="polite"
              className={cx(
                "flex min-w-0 items-center gap-2 text-sm",
                status.tone === "error"
                  ? "text-red-700"
                  : status.tone === "done"
                    ? "text-emerald-700"
                    : status.tone === "idle"
                      ? "text-neutral-500"
                      : "text-neutral-800",
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
