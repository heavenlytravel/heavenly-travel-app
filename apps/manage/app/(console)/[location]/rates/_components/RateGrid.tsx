"use client";

import Link from "next/link";
import { plural, ringgitInputValue, titleCase } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/field";
import { Tooltip } from "@repo/ui/tooltip";
import { cx } from "@repo/ui/cx";
import { PlusIcon, TrashIcon, UndoIcon } from "@repo/ui/icons";
import { toast } from "@repo/ui/toast";
import { EmptyRow } from "@repo/console/Table";
import { CardTitle } from "@repo/console/Card";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { classesHref, coverageHref } from "../../../../_lib/routes";
import {
  FiltersButton,
  StateFilterChips,
  type FilterGroup,
} from "../../../../_components/ListFilters";
import { useLeaveGuard } from "@repo/console/use-leave-guard";
import { setZoneRatesAction } from "./actions";
import {
  AddRouteDialog,
  pairKey,
  type NewRoute,
  type ZoneElsewhere,
} from "./AddRouteDialog";
import { errorOf } from "@repo/console/action-state";
import { SaveBar, type SaveStatus } from "./SaveBar";
import {
  ZONE_NAME,
  groupsOf,
  readCell,
  tidy,
  type ClassColumn,
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
const routeKey = (route: Route) => `${route.fromZoneId}|${route.toZoneId}`;
const cellKey = (route: Route, classId: string) =>
  `${routeKey(route)}|${classId}`;
/** The route a cell's key names. */
const routeKeyOfCell = (key: string) => key.split("|").slice(0, 2).join("|");

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

/**
 * The rate grid, edited as a spreadsheet: a row per route, a column per
 * class on sale, grouped by category, a price in RM in each cell. The
 * arrow keys and Enter move between cells, a block copied from a
 * spreadsheet pastes into the grid from the cell it lands in, and a cell
 * that is not a price is marked. Every cell is a box to type in, changed
 * ones tinted until saved and empty ones hatched; the save bar at the
 * grid's foot counts the changes, turning navy while there are any, saves
 * them all at once or discards them, and leaving the page with any
 * unsaved asks first. "Add Route" opens a dialog that offers only the
 * pairs of zones not on the grid yet, so a route has one row whichever
 * way it is read, and saves the route with its prices at once. A zone
 * paired with itself is its within-zone price, "Within Kuah Town", first
 * in that zone's rows. A route out of the location ends at another
 * location's zone, named with its location and marked one way (→), since
 * a trip back starts there and is priced there; "Add Route" offers those
 * zones too, by location, while cross-location is on, and while it is off
 * such a route is kept, marked not sold. An empty cell
 * is a class not offered on the route.
 *
 * A route's zones are two columns, From and To, their names cut short and
 * whole in a tooltip on hover or click; the heading stays in view while
 * the routes scroll, in the zones' order. The console's Filters button,
 * at the right of the grid's title with "Add Route" and "Delete",
 * narrows the columns to one category, and the rows to the routes of one
 * zone, that zone then read as From, or to those with a class shown
 * unpriced as saved, a chip under the title for each in force; the
 * filters live in the grid, not the address, so its unsaved prices stay. The keys and a paste follow the rows as shown. Ticked rows are
 * marked for deletion: struck through, their prices locked, until the save
 * deletes them or their undo or Discard keeps them. On a computer the save
 * bar stays in view at the foot of the screen while the grid is; on a
 * phone it ends the grid. Each class's heading counts its priced routes.
 * Narrowed to a category, "Delete" clears that category's prices of the
 * ticked routes alone, for the save to delete; the other categories'
 * prices stay.
 */
export function RateGrid({
  locationId,
  locationSlug,
  zones,
  elsewhere,
  classes: allClasses,
  cells,
  crossLocation,
  title,
  meta,
  category: firstCategory = "",
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
  /** The grid's name, in its title bar, and a note beside it. */
  title: ReactNode;
  meta?: ReactNode;
  /** The category the columns start narrowed to, by name, as the address asked: "Coach Charter"; none for every class on sale. */
  category?: string;
  /** For the teams that read the rates: the prices as text, nothing to change. */
  readOnly?: boolean;
}) {
  const [saved, setSaved] = useState<Saved>(() => savedOf(cells, zones));
  const [routes, setRoutes] = useState<Route[]>(saved.routes);
  const [values, setValues] = useState(() => valuesOf(saved));
  /** Whether "Add Route" is open. */
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** The zone whose routes alone are shown, or "" for every route. */
  const [zoneShown, setZoneShown] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  /** The category whose classes alone are columns, by name, or "" for every class on sale. */
  const [categoryShown, setCategoryShown] = useState(() =>
    allClasses.some((column) => column.category === firstCategory)
      ? firstCategory
      : "",
  );
  // The columns as shown. The prices of every class stay in the grid,
  // so a change in a hidden one is kept and saved.
  const classes = categoryShown
    ? allClasses.filter((column) => column.category === categoryShown)
    : allClasses;
  /** The ticked rows, by route key. */
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  /** The rows marked for deletion, by route key: deleted on the save. */
  const [doomed, setDoomed] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);
  // What the focused cell held when it took the focus, for Escape.
  const valueAtFocus = useRef("");
  const handlers = useRef<RowActions | null>(null);
  const actions = useMemo<RowActions>(
    () => ({
      edit: (key, text) => handlers.current?.edit(key, text),
      keyDown: (event, row, col, key) =>
        handlers.current?.keyDown(event, row, col, key),
      paste: (event, row, col) => handlers.current?.paste(event, row, col),
      tick: (route, on) => handlers.current?.tick(route, on),
      keep: (route) => handlers.current?.keep(route),
      focused: (value) => handlers.current?.focused(value),
    }),
    [],
  );
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
    for (const column of allClasses) {
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

  // The rows as shown: narrowed on the saved prices, so that typing never
  // takes a row away, in the zones' order.
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
  const shown = narrowed;

  // The ticked rows among those shown and kept: a narrowing unticks the
  // rest.
  const tickable = shown.filter((route) => !doomed.has(routeKey(route)));
  const tickedShown = tickable.filter((route) => ticked.has(routeKey(route)));

  // The zones a row can be narrowed to: this location's, then the other
  // locations' that a route runs out to.
  const zoneOptions = [
    ...zones.map((zone) => ({ value: zone.id, label: zone.name })),
    ...elsewhere
      .filter((zone) => routes.some((route) => route.toZoneId === zone.id))
      .map((zone) => ({ value: zone.id, label: nameOf(zone.id) })),
  ];

  // The pairs not on the grid yet, for "Add Route": between this
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
          allClasses.map((column) => ({
            ...route,
            vehicleClassId: column.id,
            price: added.prices[column.id] ?? "",
          })),
        ),
      ),
    );
    if (refused) return refused;
    const stored: Record<string, number> = {};
    for (const column of allClasses) {
      const reading = readCell(added.prices[column.id]);
      if (reading.ok && reading.sen !== null) {
        stored[cellKey(route, column.id)] = reading.sen;
      }
    }
    const withRoute = (prices: Record<string, number>) => {
      const next = { ...prices };
      for (const column of allClasses) delete next[cellKey(route, column.id)];
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

  function narrowTo(zone: string, gaps: boolean, category = categoryShown) {
    setZoneShown(zone);
    setGapsOnly(gaps);
    setCategoryShown(category);
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
    setTicked(new Set());
    if (!categoryShown) {
      setDoomed(new Set([...doomed, ...tickedShown.map(routeKey)]));
      setNotice(null);
      return;
    }
    // Narrowed to a category: its prices of the routes are cleared, as
    // changes the save stores; the route keeps the other categories'.
    const cleared: Record<string, string> = {};
    for (const route of tickedShown) {
      for (const column of classes) cleared[cellKey(route, column.id)] = "";
    }
    setValues((current) => ({ ...current, ...cleared }));
    setNotice({
      tone: "info",
      text: `Cleared the ${categoryShown.toLowerCase()} prices of ${plural(tickedShown.length, "route")}.`,
    });
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
      for (const column of allClasses) {
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
        for (const column of allClasses) {
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

  // The row handlers as they are now, for the rows' stable `actions`: a
  // row redraws only when its own cells or state change, not on every
  // keystroke elsewhere in the grid.
  useLayoutEffect(() => {
    handlers.current = {
      edit,
      keyDown: onCellKeyDown,
      paste: onCellPaste,
      tick,
      keep,
      focused: (value) => {
        valueAtFocus.current = value;
      },
    };
  });

  const titleBar = (action?: ReactNode) => (
    <CardTitle inset meta={meta} action={action}>
      {title}
    </CardTitle>
  );

  if (zones.length === 0) {
    return (
      <>
        {titleBar()}
        <p className="px-5 py-5 text-sm text-muted">
          A route runs between two zones, or within one. Draw the zones on{" "}
          <Link href={coverageHref(locationSlug)} className="text-link">
            Coverage
          </Link>{" "}
          to put a route on the grid.
        </p>
      </>
    );
  }
  if (allClasses.length === 0) {
    return (
      <>
        {titleBar()}
        <p className="px-5 py-5 text-sm text-muted">
          Each class on sale is a column of the grid. Put a class on sale in{" "}
          <Link href={classesHref(locationSlug)} className="text-link">
            Classes
          </Link>{" "}
          to price a route for it.
        </p>
      </>
    );
  }

  const groups = groupsOf(classes);
  const grouped = groups.length > 1;
  const emptyMeans = EMPTY_CELL_MEANING;
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
      className={cx(
        "border-b border-hairline py-2.5 text-left align-bottom font-semibold tracking-caps uppercase",
        by === "from" ? (readOnly ? "pr-3 pl-5" : "px-3") : "pr-3 pl-9",
      )}
    >
      {by === "from" ? "From" : "To"}
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

  let status: SaveStatus;
  if (pending) status = { tone: "idle", text: "Saving…" };
  else if (notice?.tone === "error") status = notice;
  else if (invalid.size > 0) {
    // A bad cell in a category the filter hides still holds the save: say
    // where it is.
    const shownIds = new Set(classes.map((column) => column.id));
    const hiddenIn = [
      ...new Set(
        [...invalid].flatMap((key) => {
          const column = allClasses.find((c) => c.id === key.split("|")[2]);
          return column && !shownIds.has(column.id) ? [column.category] : [];
        }),
      ),
    ];
    status = {
      tone: "error",
      text: `${invalid.size === 1 ? "One cell is" : `${invalid.size} cells are`} not a price. Enter RM with at most two decimals, or clear ${invalid.size === 1 ? "it" : "them"}.${hiddenIn.length > 0 ? ` Show ${hiddenIn.join(" and ")} in Filters to find ${invalid.size === 1 ? "it" : "them"}.` : ""}`,
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

  const categories = groupsOf(allClasses).map((group) => group.label);
  const narrowing = routes.length > 1 || categories.length > 1;
  // The grid's filters, as the console's Filters button and chips take them.
  const filters: FilterGroup[] = [
    ...(categories.length > 1
      ? [
          {
            param: "category",
            label: "Category",
            options: categories.map((label) => ({ value: label, label })),
            value: categoryShown,
          },
        ]
      : []),
    {
      param: "zone",
      label: "Zone",
      options: zoneOptions,
      value: zoneShown,
    },
    {
      param: "gaps",
      label: "Empty Cells",
      options: [{ value: "1", label: `With an Empty Cell (${gaps})` }],
      value: gapsOnly ? "1" : "",
    },
  ];
  function filterBy(changes: Record<string, string | undefined>) {
    narrowTo(
      "zone" in changes ? (changes.zone ?? "") : zoneShown,
      "gaps" in changes ? changes.gaps === "1" : gapsOnly,
      "category" in changes ? (changes.category ?? "") : categoryShown,
    );
  }

  return (
    <>
      {titleBar(
        readOnly && !narrowing ? null : (
          <>
            {filtering ? (
              <span className="text-caption text-muted tabular-nums">
                {shown.length} of {plural(routes.length, "route")}
              </span>
            ) : null}
            {readOnly ? null : (
              <>
                <Tooltip
                  content={canAdd ? null : "Every pair of zones has a row."}
                >
                  <Button
                    variant="secondary"
                    disabled={pending || !canAdd}
                    onClick={() => setAdding(true)}
                  >
                    <PlusIcon />
                    Add Route
                  </Button>
                </Tooltip>
                <Tooltip
                  content={
                    ticks === 0
                      ? "Tick the routes to delete."
                      : categoryShown
                        ? `Clears their ${categoryShown.toLowerCase()} prices only.`
                        : null
                  }
                >
                  <Button
                    variant="danger"
                    disabled={pending || ticks === 0}
                    onClick={deleteTicked}
                  >
                    <TrashIcon />
                    {ticks > 0
                      ? titleCase(`Delete ${plural(ticks, "route")}`)
                      : "Delete"}
                  </Button>
                </Tooltip>
              </>
            )}
            {narrowing ? (
              <FiltersButton groups={filters} onChange={filterBy} />
            ) : null}
          </>
        ),
      )}
      <StateFilterChips groups={filters} onChange={filterBy} />
      <div className="relative">
        <div
          ref={gridRef}
          className="relative isolate max-h-[70vh] overflow-auto overscroll-x-contain border-b border-hairline"
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            {/* Raised in the grid's own stacking (`isolate`), so it stays under the console's top bar. */}
            <thead className="sticky top-0 z-(--layer-raised) bg-shade text-2xs text-muted">
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
                      <span className="block border-b border-edge pb-1.5 text-center tracking-caps whitespace-nowrap text-body uppercase">
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
                    className="border-b border-hairline px-3 py-2.5 text-right align-bottom text-body"
                  >
                    <span className="font-semibold tracking-caps uppercase">
                      {column.name}
                    </span>
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
                <EmptyRow colSpan={classes.length + (readOnly ? 2 : 3)}>
                  {routes.length > 0 ? (
                    <>
                      No route matches.{" "}
                      <button
                        type="button"
                        onClick={() => narrowTo("", false)}
                        className="text-link"
                      >
                        Show Every Route
                      </button>
                    </>
                  ) : (
                    "No routes yet, so no transfer can be priced here: every trip is priced from the grid."
                  )}
                </EmptyRow>
              ) : (
                shown.map((route, row) => {
                  const [a, b] = shownEndsOf(route);
                  const out = isOut(route);
                  const keys = classes.map((column) =>
                    cellKey(route, column.id),
                  );
                  return (
                    <RouteRow
                      key={routeKey(route)}
                      route={route}
                      row={row}
                      last={row === shown.length - 1}
                      fromName={zoneNameOf(a)}
                      toName={zoneNameOf(b)}
                      fromFull={nameOf(a)}
                      toFull={nameOf(b)}
                      out={out}
                      within={isWithin(route)}
                      awayLocation={
                        out
                          ? (awayOf(route.toZoneId)?.location ??
                            "Another location")
                          : null
                      }
                      crossLocation={crossLocation}
                      classes={classes}
                      values={keys.map((key) => values[key] ?? "")}
                      bad={keys.map((key) => invalid.has(key))}
                      changed={keys.map((key) => changed.has(key))}
                      isTicked={ticked.has(routeKey(route))}
                      isDoomed={doomed.has(routeKey(route))}
                      readOnly={Boolean(readOnly)}
                      pending={pending}
                      actions={actions}
                    />
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
              <CellKey swatch="border-danger-edge bg-danger-tint">
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
          Click a cut-short name to read it whole.
          {readOnly
            ? null
            : " Paste a block of prices copied from a spreadsheet into any cell; Enter moves down a row, Escape undoes the cell."}
        </p>
      </div>

      {readOnly ? null : (
        <>
          <SaveBar
            dirty={dirty}
            pending={pending}
            status={status}
            canSave={invalid.size === 0}
            onDiscard={discard}
            onSave={save}
            label="Save Rates"
          />
          {leaveDialog}
          <AddRouteDialog
            open={adding}
            onOpenChange={setAdding}
            zones={zones}
            elsewhere={crossLocation ? elsewhere : []}
            classes={allClasses}
            paired={paired}
            onAdd={addRoute}
          />
        </>
      )}
    </>
  );
}

/** What a row does, through the grid: stable, so the rows stay memoised. */
type RowActions = {
  edit: (key: string, text: string) => void;
  keyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number,
    key: string,
  ) => void;
  paste: (
    event: ClipboardEvent<HTMLInputElement>,
    row: number,
    col: number,
  ) => void;
  tick: (route: Route, on: boolean) => void;
  keep: (route: Route) => void;
  /** A cell took the focus holding this, which Escape puts back. */
  focused: (value: string) => void;
};

type RouteRowProps = {
  route: Route;
  row: number;
  last: boolean;
  /** The zones' names as the row shows them, and in full for the labels. */
  fromName: string;
  toName: string;
  fromFull: string;
  toFull: string;
  out: boolean;
  within: boolean;
  /** The other location's name, on a route out. */
  awayLocation: string | null;
  crossLocation: boolean;
  classes: readonly ClassColumn[];
  /** Each class's cell as typed, whether it is not a price, and whether it changed since the save. */
  values: readonly string[];
  bad: readonly boolean[];
  changed: readonly boolean[];
  isTicked: boolean;
  isDoomed: boolean;
  readOnly: boolean;
  pending: boolean;
  actions: RowActions;
};

/** The same row: every prop the same, the cells' lists cell by cell. */
function sameRow(was: RouteRowProps, now: RouteRowProps) {
  for (const key of Object.keys(now) as (keyof RouteRowProps)[]) {
    const a = was[key];
    const b = now[key];
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length || a.some((x, i) => x !== b[i])) return false;
    } else if (a !== b) return false;
  }
  return true;
}

/**
 * One route of the grid: its tick (or its undo once marked for deletion),
 * its zones, and a price cell per class. Memoised: typing in a cell
 * redraws its row alone.
 */
const RouteRow = memo(function RouteRow({
  route,
  row,
  last,
  fromName,
  toName,
  fromFull,
  toFull,
  out,
  within,
  awayLocation,
  crossLocation,
  classes,
  values,
  bad: badAt,
  changed: changedAt,
  isTicked,
  isDoomed,
  readOnly,
  pending,
  actions,
}: RouteRowProps) {
  const label = within
    ? `within ${fromFull}`
    : `${fromFull} ${out ? "to" : "and"} ${toFull}`;
  const whole = within
    ? `Within ${fromFull}: a trip that starts and ends in it, or maps to it at both ends.`
    : out
      ? `${fromFull} → ${toFull}: trips from here only; a trip back is priced where it starts.`
      : `${fromFull} ↔ ${toFull}, the same price both ways.`;
  // The row's shade, the same in every cell of it.
  const shade = isDoomed
    ? "bg-danger-tint/70"
    : isTicked
      ? "bg-shade"
      : "group-hover:bg-hover";
  const line = !last && "border-b border-hairline";
  const lead = cx(
    "py-0 text-left align-middle font-normal",
    shade,
    isDoomed && "text-muted line-through",
    line,
  );
  return (
    <tr className="group">
      {readOnly ? null : (
        <td className={cx(lead, "w-px pr-1 pl-5")}>
          {isDoomed ? (
            <Tooltip content="Keep this route">
              <button
                type="button"
                disabled={pending}
                onClick={() => actions.keep(route)}
                aria-label={`Keep the route between ${label}`}
                className="-m-1 inline-flex size-6 items-center justify-center rounded-md text-muted hover:bg-danger-edge/50 hover:text-ink focus-ring"
              >
                <UndoIcon className="size-3.5" />
              </button>
            </Tooltip>
          ) : (
            <Checkbox
              aria-label={`Tick the route between ${label}`}
              checked={isTicked}
              onChange={(event) => actions.tick(route, event.target.checked)}
            />
          )}
        </td>
      )}
      <th scope="row" className={cx(lead, readOnly ? "pr-3 pl-5" : "px-3")}>
        <Tooltip content={whole} openOnClick>
          <span
            className={cx(ZONE_NAME, isDoomed && "text-muted line-through")}
          >
            {fromName}
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
              className={cx("text-muted italic", isDoomed && "line-through")}
            >
              Within the Zone
            </span>
          ) : (
            <>
              <span className="sr-only">{out ? "to" : "and"}</span>
              <Tooltip content={whole} openOnClick className="min-w-0">
                <span
                  className={cx(
                    ZONE_NAME,
                    isDoomed && "text-muted line-through",
                  )}
                >
                  {toName}
                </span>
              </Tooltip>
            </>
          )}
          {out ? <Badge>{awayLocation}</Badge> : null}
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
        const value = values[col] ?? "";
        const bad = badAt[col];
        const empty = !value.trim();
        return (
          <td key={column.id} className={cx(CELL_PAD, shade, line)}>
            {readOnly ? (
              <span
                className={cx(
                  "block h-9 min-w-24 rounded-lg px-2.5 text-right text-sm leading-9 text-ink tabular-nums",
                  empty && EMPTY_CELL,
                )}
              >
                {/* Read out before the price: a label on a plain span is not. */}
                <span className="sr-only">
                  {`${label}, ${column.name}, ${empty ? EMPTY_CELL_MEANING.toLowerCase() : "price in RM"} `}
                </span>
                {value}
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
                value={value}
                onChange={(event) => actions.edit(key, event.target.value)}
                onFocus={(event) => {
                  actions.focused(event.target.value);
                  event.target.select();
                }}
                onBlur={(event) => {
                  const text = tidy(event.target.value);
                  if (text !== event.target.value) actions.edit(key, text);
                }}
                onKeyDown={(event) => actions.keyDown(event, row, col, key)}
                onPaste={(event) => actions.paste(event, row, col)}
                className={cx(
                  CELL_INPUT,
                  isDoomed
                    ? CELL_DOOMED
                    : bad
                      ? CELL_BAD
                      : changedAt[col]
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
}, sameRow);
