"use client";

import { parseRinggit } from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Dialog } from "@repo/ui/dialog";
import { Field } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { Fragment, useState, useTransition, type FormEvent } from "react";
import { FormError } from "../../../../_components/FormError";
import { CELL_INPUT, CellKey, EMPTY_CELL, EMPTY_CELL_MEANING } from "./cells";

type Zone = { id: string; name: string };
/** Another location's zone, by name: a route out of this location may end at it. */
export type ZoneElsewhere = { id: string; name: string; location: string };
type ClassColumn = { id: string; name: string; category: string };

/** The two zones in either order: a route is read both ways, so a pair has one row. */
export const pairKey = (a: string, b: string) =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

/** What the dialog hands back: the route and a price for each class given one, in ringgit as typed. */
export type NewRoute = {
  fromZoneId: string;
  toZoneId: string;
  prices: Record<string, string>;
};

/**
 * "Add route" as a dialog: the two zones of the route, then its price
 * for each class on sale, a row each in a table grouped by category,
 * its cells drawn as the grid's, an empty one hatched. Only the zones with a pair
 * still free are offered, and only the free partners of the zone picked
 * first, so a route cannot be added twice or the other way round. "To"
 * offers this location's zones, the one picked first among them as
 * "Within this zone": the zone's within-zone price. Given other
 * locations' zones, while cross-location is on, "To" offers those too,
 * grouped by location: such a route ends at that zone itself, which stays
 * its location's, and prices trips from here to it only. At least
 * one price is needed, since a route with none is no row on the grid.
 * `onAdd` saves the route; its error, if any, stays in the dialog.
 */
export function AddRouteDialog({
  open,
  onOpenChange,
  zones,
  elsewhere,
  classes,
  paired,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: readonly Zone[];
  /** Other locations' zones a route out may end at; none while cross-location is off. */
  elsewhere: readonly ZoneElsewhere[];
  classes: readonly ClassColumn[];
  /** The pairs on the grid already, by `pairKey`. */
  paired: ReadonlySet<string>;
  /** Saves the route; answers an error to show, or null once saved. */
  onAdd: (route: NewRoute) => Promise<string | null>;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a route"
      description={
        elsewhere.length > 0
          ? "Pick the two zones, the same one for a trip within it, then price the route for the classes it serves. A route here costs the same both ways; one to another location's zone prices trips from here to it only."
          : "Pick the two zones, the same one for a trip within it, then price the route for the classes it serves. A route costs the same both ways."
      }
      width="md"
    >
      <RouteForm
        zones={zones}
        elsewhere={elsewhere}
        classes={classes}
        paired={paired}
        onAdd={onAdd}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

/** The dialog's form, mounted afresh each time the dialog opens. */
function RouteForm({
  zones,
  elsewhere,
  classes,
  paired,
  onAdd,
  onCancel,
}: {
  zones: readonly Zone[];
  elsewhere: readonly ZoneElsewhere[];
  classes: readonly ClassColumn[];
  paired: ReadonlySet<string>;
  onAdd: (route: NewRoute) => Promise<string | null>;
  onCancel: () => void;
}) {
  const ends = [...zones, ...elsewhere];
  const partnersOf = (id: string): Zone[] =>
    ends.filter((zone) => !paired.has(pairKey(id, zone.id)));
  const [from, setFrom] = useState(
    () => zones.find((zone) => partnersOf(zone.id).length > 0)?.id ?? "",
  );
  const partners = from ? partnersOf(from) : [];
  const [to, setTo] = useState(() => partners[0]?.id ?? "");
  const toId = partners.some((zone) => zone.id === to)
    ? to
    : (partners[0]?.id ?? "");
  const out = elsewhere.find((zone) => zone.id === toId);
  // The other locations' zones by location, in the order they came.
  const byLocation = new Map<string, ZoneElsewhere[]>();
  for (const zone of elsewhere) {
    byLocation.set(zone.location, [
      ...(byLocation.get(zone.location) ?? []),
      zone,
    ]);
  }
  const option = (zone: Zone) => {
    const taken = paired.has(pairKey(from, zone.id));
    const name = zone.id === from ? "Within this zone" : zone.name;
    return {
      value: zone.id,
      label: taken ? `${name} (on the grid)` : name,
      disabled: taken,
    };
  };
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const priced = classes.filter((column) => prices[column.id]?.trim());
  const invalid = priced.filter(
    (column) => parseRinggit(prices[column.id] ?? "") === null,
  );
  const groups = [...new Set(classes.map((column) => column.category))];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!from || !toId) return;
    if (priced.length === 0) {
      setError("Enter a price for at least one class.");
      return;
    }
    if (invalid.length > 0) {
      setError(
        `${invalid.map((column) => column.name).join(", ")}: enter RM with at most two decimals.`,
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const failed = await onAdd({ fromZoneId: from, toZoneId: toId, prices });
      if (failed) setError(failed);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label="From">
          <Select
            value={from}
            onValueChange={(next) => {
              setFrom(next);
              setTo("");
            }}
            options={zones.map((zone) => ({
              value: zone.id,
              label: zone.name,
              disabled: partnersOf(zone.id).length === 0,
            }))}
          />
        </Field>
        <span aria-hidden="true" className="pb-2.5 text-slate-400">
          {out ? "→" : "↔"}
        </span>
        <Field label="To">
          <Select
            value={toId}
            onValueChange={setTo}
            options={
              elsewhere.length > 0
                ? [
                    { label: "This location", options: zones.map(option) },
                    ...[...byLocation].map(([location, list]) => ({
                      label: `In ${location}`,
                      options: list.map(option),
                    })),
                  ]
                : zones.map(option)
            }
          />
        </Field>
      </div>
      {out ? (
        <p className="-mt-2 text-xs text-slate-500">
          {out.name} stays {out.location}'s zone: this prices trips from here to
          it. A trip from it is priced on {out.location}'s own grid.
        </p>
      ) : null}

      <div className="grid gap-2">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Class
                </th>
                <th
                  scope="col"
                  className="w-36 border-l border-slate-200 px-3 py-2 text-right font-medium"
                >
                  Price, RM
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((category) => (
                <Fragment key={category}>
                  {groups.length > 1 ? (
                    <tr>
                      <th
                        scope="colgroup"
                        colSpan={2}
                        className="border-t border-slate-200 bg-slate-50/60 px-3 py-1.5 text-left text-xs font-medium text-slate-500"
                      >
                        {category}
                      </th>
                    </tr>
                  ) : null}
                  {classes
                    .filter((column) => column.category === category)
                    .map((column) => {
                      const bad = invalid.includes(column);
                      const empty = !prices[column.id]?.trim();
                      return (
                        <tr key={column.id}>
                          <th
                            scope="row"
                            className="border-t border-slate-200 px-3 text-left font-normal text-slate-800"
                          >
                            {column.name}
                          </th>
                          <td
                            className={cx(
                              "border-t border-l border-slate-200 p-0",
                              bad ? "bg-red-50" : empty && EMPTY_CELL,
                            )}
                          >
                            <input
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${column.name}, price in RM`}
                              aria-invalid={bad || undefined}
                              value={prices[column.id] ?? ""}
                              onChange={(event) =>
                                setPrices((was) => ({
                                  ...was,
                                  [column.id]: event.target.value,
                                }))
                              }
                              className={cx(CELL_INPUT, bad && "text-red-700")}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          <CellKey swatch={cx("border-slate-300", EMPTY_CELL)}>
            {EMPTY_CELL_MEANING}
          </CellKey>
        </p>
      </div>

      <FormError error={error} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !toId}>
          {pending ? "Adding…" : "Add route"}
        </Button>
      </div>
    </form>
  );
}
