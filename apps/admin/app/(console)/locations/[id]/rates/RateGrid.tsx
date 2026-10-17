"use client";

import { ringgitInputValue, type DropoffRule } from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Select } from "@repo/ui/field";
import { XIcon } from "@repo/ui/icons";
import { useState, useTransition } from "react";
import { Table, TBody, Td, Th, THead } from "../../../../_components/Table";
import { setZoneRatesAction } from "./actions";

type Zone = { id: string; name: string };
type ClassColumn = { id: string; name: string };
type Cell = {
  fromZoneId: string;
  toZoneId: string;
  vehicleClassId: string;
  priceSen: number;
};
type Route = { fromZoneId: string; toZoneId: string };

const routeKey = (route: Route) => `${route.fromZoneId}|${route.toZoneId}`;
const cellKey = (route: Route, classId: string) =>
  `${routeKey(route)}|${classId}`;

/** The routes the stored cells name, each once, in the order first seen. */
function routesOf(cells: readonly Cell[]): Route[] {
  const seen = new Map<string, Route>();
  for (const cell of cells) {
    const route = { fromZoneId: cell.fromZoneId, toZoneId: cell.toZoneId };
    if (!seen.has(routeKey(route))) seen.set(routeKey(route), route);
  }
  return [...seen.values()];
}

/** A price cell: "RM" and the amount, right-aligned, empty for what the rule says an empty cell means. */
const PRICE_INPUT =
  "h-9 w-full min-w-28 rounded-md border border-neutral-300 bg-white py-1.5 pr-3 pl-10 text-right text-sm tabular-nums outline-hidden placeholder:text-neutral-400 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900";

/**
 * The rate grid as a form: a row per route, a column per class on sale, a
 * price in each cell, typed in ringgit. "Add route" adds a row for two
 * zones; the cross at a row's end clears it. Save posts every cell, so a
 * row left with no prices is a row with nothing on the grid. What an empty
 * cell means follows the drop-off rule: metered, or not offered.
 */
export function RateGrid({
  locationId,
  zones,
  classes,
  cells,
  rule,
}: {
  locationId: string;
  zones: Zone[];
  classes: ClassColumn[];
  cells: Cell[];
  rule: DropoffRule;
}) {
  const [routes, setRoutes] = useState<Route[]>(() => routesOf(cells));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      cells.map((cell) => [
        cellKey(cell, cell.vehicleClassId),
        ringgitInputValue(cell.priceSen),
      ]),
    ),
  );
  const [from, setFrom] = useState(zones[0]?.id ?? "");
  const [to, setTo] = useState(zones[1]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const zoneName = (id: string) =>
    zones.find((zone) => zone.id === id)?.name ?? "?";
  const emptyMeans = rule === "grid" ? "not offered" : "metered";
  const emptyCells = routes.reduce(
    (count, route) =>
      count +
      classes.filter((column) => !values[cellKey(route, column.id)]?.trim())
        .length,
    0,
  );

  if (zones.length < 2) {
    return (
      <p className="text-sm text-neutral-500">
        Add at least two zones to put a route on the grid.
      </p>
    );
  }
  if (classes.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Put a class on sale on the Vehicle classes tab to price routes for it.
      </p>
    );
  }

  function addRoute() {
    if (!from || !to || from === to) return;
    const route = { fromZoneId: from, toZoneId: to };
    const reverse = { fromZoneId: to, toZoneId: from };
    if (
      routes.some(
        (r) =>
          routeKey(r) === routeKey(route) || routeKey(r) === routeKey(reverse),
      )
    ) {
      setError("That route is on the grid already, one way or the other.");
      return;
    }
    setError(null);
    setSaved(false);
    setRoutes([...routes, route]);
  }

  function removeRoute(route: Route) {
    setSaved(false);
    setRoutes(routes.filter((r) => routeKey(r) !== routeKey(route)));
    setValues((current) => {
      const next = { ...current };
      for (const column of classes) next[cellKey(route, column.id)] = "";
      return next;
    });
  }

  function save() {
    // Every cell of the grid, and the cells of removed rows as cleared.
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
    for (const cell of cells) {
      const key = cellKey(cell, cell.vehicleClassId);
      if (
        !routes.some((route) => cellKey(route, cell.vehicleClassId) === key)
      ) {
        rows.push({
          fromZoneId: cell.fromZoneId,
          toZoneId: cell.toZoneId,
          vehicleClassId: cell.vehicleClassId,
          price: "",
        });
      }
    }
    startTransition(async () => {
      const result = await setZoneRatesAction(locationId, rows);
      setError(result?.error ?? null);
      setSaved(result === null);
    });
  }

  return (
    <div className="grid gap-4">
      <Table>
        <THead>
          <Th>Route</Th>
          {classes.map((column) => (
            <Th key={column.id} align="right">
              {column.name}
            </Th>
          ))}
          <Th />
        </THead>
        <TBody>
          {routes.map((route) => (
            <tr key={routeKey(route)}>
              <Td className="font-medium whitespace-nowrap">
                {zoneName(route.fromZoneId)}
                <span aria-hidden="true" className="mx-1.5 text-neutral-400">
                  →
                </span>
                {zoneName(route.toZoneId)}
              </Td>
              {classes.map((column) => {
                const key = cellKey(route, column.id);
                return (
                  <Td key={column.id} className="py-2">
                    <label className="relative block">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-neutral-500"
                      >
                        RM
                      </span>
                      <input
                        aria-label={`${zoneName(route.fromZoneId)} to ${zoneName(route.toZoneId)}, ${column.name}, RM`}
                        inputMode="decimal"
                        placeholder={emptyMeans}
                        className={PRICE_INPUT}
                        value={values[key] ?? ""}
                        onChange={(event) => {
                          setSaved(false);
                          setValues((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }));
                        }}
                      />
                    </label>
                  </Td>
                );
              })}
              <Td className="w-12 py-2 pr-3 pl-0 text-right">
                <button
                  type="button"
                  aria-label={`Remove the route ${zoneName(route.fromZoneId)} to ${zoneName(route.toZoneId)}`}
                  title="Remove route"
                  onClick={() => removeRoute(route)}
                  className="inline-flex size-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <XIcon />
                </button>
              </Td>
            </tr>
          ))}
          <tr className={cx(routes.length > 0 && "bg-neutral-50/60")}>
            <td colSpan={classes.length + 2} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-neutral-600">
                  {routes.length === 0 ? "First route:" : "Add a route:"}
                </span>
                <Select
                  aria-label="From zone"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-9 w-auto min-w-40 py-1"
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </Select>
                <span className="text-neutral-500">to</span>
                <Select
                  aria-label="To zone"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-9 w-auto min-w-40 py-1"
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!from || !to || from === to}
                  onClick={addRoute}
                >
                  Add route
                </Button>
              </div>
            </td>
          </tr>
        </TBody>
      </Table>

      <p className="text-xs text-neutral-500">
        A route is read both ways.{" "}
        {rule === "grid"
          ? emptyCells > 0
            ? `${emptyCells === 1 ? "One empty cell: that class is" : `${emptyCells} empty cells: those classes are`} not offered on the route, since only the grid's routes are served.`
            : "An empty cell would mean the class is not offered on that route, since only the grid's routes are served."
          : "An empty cell means the trip is metered at the class's rates."}
      </p>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || routes.length === 0}>
          {pending ? "Saving…" : "Save rates"}
        </Button>
        {error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {error}
          </p>
        ) : saved ? (
          <p aria-live="polite" className="text-sm text-emerald-700">
            Saved.
          </p>
        ) : null}
      </div>
    </div>
  );
}
