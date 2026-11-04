"use client";

import {
  HOURLY_LIMITS,
  HOURLY_PACKAGES,
  durationLabel,
  plural,
  ringgitInputValue,
  type HourlyList,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { cx } from "@repo/ui/cx";
import { Select } from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import { errorOf } from "@repo/console/action-state";
import { useLeaveGuard } from "@repo/console/use-leave-guard";
import { useCallback, useState, useTransition } from "react";
import { setHourlyListAction } from "./actions";
import {
  CELL_BAD,
  CELL_CHANGED,
  CELL_INPUT,
  CELL_PAD,
  CELL_PLAIN,
  CellKey,
  EMPTY_CELL,
  ZONE_NAME,
  groupsOf,
  PriceCell,
  readCell,
  senOf,
  type ClassColumn,
} from "./cells";
import { SaveBar, type SaveStatus } from "./SaveBar";

type Zone = { id: string; name: string };

/** The list as the page holds it, each value as its input shows it. */
type Values = {
  /** Prices by `priceKey`, in ringgit as typed. */
  prices: Record<string, string>;
  /** The hours each zone's package covers, by `coversKey`. */
  covers: Record<string, string>;
  /** Extra hour rates by `extraKey`. */
  extras: Record<string, string>;
};

const priceKey = (zoneId: string, size: number, classId: string) =>
  `${zoneId}|${size}|${classId}`;
const coversKey = (zoneId: string, size: number) => `${zoneId}|${size}`;
const extraKey = (size: number, classId: string) => `${size}|${classId}`;

function valuesOf(list: HourlyList, zones: readonly Zone[]): Values {
  const values: Values = { prices: {}, covers: {}, extras: {} };
  for (const zone of zones) {
    for (const size of HOURLY_PACKAGES) {
      values.covers[coversKey(zone.id, size)] = String(size);
    }
  }
  for (const zone of list.zones) {
    for (const row of zone.packages) {
      values.covers[coversKey(zone.zoneId, row.hours)] = String(
        row.includedHours,
      );
      for (const [classId, sen] of Object.entries(row.prices)) {
        values.prices[priceKey(zone.zoneId, row.hours, classId)] =
          ringgitInputValue(sen);
      }
    }
  }
  for (const extra of list.extras) {
    values.extras[extraKey(extra.packageHours, extra.vehicleClassId)] =
      ringgitInputValue(extra.priceSen);
  }
  return values;
}

/** The values as the action reads them (`parseHourlyList`). */
function postedOf(
  values: Values,
  zones: readonly Zone[],
  classes: readonly ClassColumn[],
) {
  return {
    zones: zones.map((zone) => ({
      zoneId: zone.id,
      packages: HOURLY_PACKAGES.map((size) => ({
        hours: size,
        includedHours: Number(values.covers[coversKey(zone.id, size)]),
        prices: classes.map((column) => ({
          vehicleClassId: column.id,
          price: values.prices[priceKey(zone.id, size, column.id)] ?? "",
        })),
      })),
    })),
    extras: HOURLY_PACKAGES.flatMap((size) =>
      classes.map((column) => ({
        packageHours: size,
        vehicleClassId: column.id,
        price: values.extras[extraKey(size, column.id)] ?? "",
      })),
    ),
  };
}

/** Whether the hours a package covers are a whole number it may cover. */
function coversOk(text: string | undefined) {
  const trimmed = (text ?? "").trim();
  const { min, max } = HOURLY_LIMITS.includedHours;
  return (
    /^\d+$/.test(trimmed) && Number(trimmed) >= min && Number(trimmed) <= max
  );
}

/** A heading of the lead columns, over both heading rows when the classes are grouped. */
const LEAD_HEADING =
  "border-b border-hairline py-2.5 align-bottom font-semibold text-body";

/**
 * A location's hourly price list, in the rate grid's look: for each zone,
 * "Pickup from" it, a row for each of the 4, 8 and 12-hour packages, the
 * hours the package covers from there, and its price per class; then the
 * rate per extra hour for each package size, the same from every zone. An
 * empty price is not sold. Saved whole. Read only for the teams that read
 * the rates. See docs/261102-booking-ops.md, "Hourly rate grid".
 */
export function HourlyRates({
  locationId,
  zones,
  classes,
  list,
  readOnly = false,
}: {
  locationId: string;
  /** The location's zones, in their order. */
  zones: Zone[];
  classes: ClassColumn[];
  list: HourlyList;
  readOnly?: boolean;
}) {
  const [saved, setSaved] = useState<Values>(() => valuesOf(list, zones));
  const [values, setValues] = useState<Values>(saved);
  const [error, setError] = useState<string | null>(null);
  /** The zone whose rows alone are shown, or "" for every zone. */
  const [zoneShown, setZoneShown] = useState("");
  const [pending, startTransition] = useTransition();

  // Against what is saved: the cells changed, and those that are not right.
  const priceCells = [
    ...zones.flatMap((zone) =>
      HOURLY_PACKAGES.flatMap((size) =>
        classes.map(
          (column) => ["prices", priceKey(zone.id, size, column.id)] as const,
        ),
      ),
    ),
    ...HOURLY_PACKAGES.flatMap((size) =>
      classes.map((column) => ["extras", extraKey(size, column.id)] as const),
    ),
  ];
  const invalid = new Set<string>();
  let changes = 0;
  for (const [part, key] of priceCells) {
    if (!readCell(values[part][key]).ok) invalid.add(key);
    else if (senOf(values[part][key]) !== senOf(saved[part][key])) changes += 1;
  }
  for (const zone of zones) {
    for (const size of HOURLY_PACKAGES) {
      const key = coversKey(zone.id, size);
      if (!coversOk(values.covers[key])) invalid.add(key);
      else if (values.covers[key]?.trim() !== saved.covers[key]?.trim()) {
        changes += 1;
      }
    }
  }
  const dirty = changes + invalid.size > 0;
  const leaveDialog = useLeaveGuard(
    dirty,
    "The hourly prices changed since the last save are lost.",
  );

  // Stable, as it only sets state, so a price cell redraws alone.
  const edit = useCallback((part: keyof Values, key: string, text: string) => {
    setError(null);
    setValues((current) => ({
      ...current,
      [part]: { ...current[part], [key]: text },
    }));
  }, []);
  /** A price cell, `part:key`, as typed. */
  const editCell = useCallback(
    (cell: string, text: string) => {
      const at = cell.indexOf(":");
      edit(cell.slice(0, at) as keyof Values, cell.slice(at + 1), text);
    },
    [edit],
  );

  function save() {
    if (invalid.size > 0) return;
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(
          setHourlyListAction(locationId, postedOf(values, zones, classes)),
        ),
      );
      if (refused) {
        setError(refused);
        return;
      }
      setSaved(values);
      setError(null);
      toast.success("Hourly rates saved.");
    });
  }

  let status: SaveStatus;
  if (pending) status = { tone: "idle", text: "Saving…" };
  else if (error) status = { tone: "error", text: error };
  else if (invalid.size > 0) {
    status = {
      tone: "error",
      text: `${invalid.size === 1 ? "One cell is" : `${invalid.size} cells are`} not right: a price is RM with at most two decimals, and a duration covers ${HOURLY_LIMITS.includedHours.min} to ${HOURLY_LIMITS.includedHours.max} whole hours.`,
    };
  } else if (dirty) {
    status = { tone: "dirty", text: `${plural(changes, "unsaved change")}.` };
  } else status = { tone: "idle", text: "No unsaved changes." };

  if (zones.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-muted">
        Draw this location&apos;s zones on Coverage first: hourly hire is priced
        by the zone the pickup is in.
      </p>
    );
  }

  const groups = groupsOf(classes);
  const grouped = groups.length > 1;
  const shownZones = zones.filter(
    (zone) => zoneShown === "" || zone.id === zoneShown,
  );
  const unsold = zones.filter(
    (zone) =>
      !HOURLY_PACKAGES.some((size) =>
        classes.some(
          (column) =>
            senOf(saved.prices[priceKey(zone.id, size, column.id)]) !== null,
        ),
      ),
  ).length;

  /** A price cell in the grid's look. */
  function priceCell(
    part: "prices" | "extras",
    key: string,
    label: string,
    line: string | false,
  ) {
    return (
      <PriceCell
        key={key}
        label={label}
        text={values[part][key] ?? ""}
        saved={saved[part][key]}
        invalid={invalid.has(key)}
        readOnly={readOnly}
        pending={pending}
        cell={`${part}:${key}`}
        onEdit={editCell}
        className={line}
      />
    );
  }

  const span = grouped ? 2 : undefined;
  const leadHeadings = [
    <th
      key="from"
      scope="col"
      rowSpan={span}
      className={cx(LEAD_HEADING, "pr-3 pl-5 text-left")}
    >
      Pickup from
    </th>,
    <th
      key="duration"
      scope="col"
      rowSpan={span}
      className={cx(LEAD_HEADING, "px-3 text-left")}
    >
      Duration
    </th>,
    <th
      key="covers"
      scope="col"
      rowSpan={span}
      className={cx(LEAD_HEADING, "px-3 text-right")}
    >
      Covers (h)
    </th>,
  ];

  return (
    <>
      {zones.length > 1 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-hairline px-5 py-3">
          <Select
            aria-label="Show the rates of one zone"
            value={zoneShown}
            onValueChange={setZoneShown}
            options={[
              { value: "", label: "Every zone" },
              ...zones.map((zone) => ({ value: zone.id, label: zone.name })),
            ]}
            className="w-full sm:w-64"
          />
          {unsold > 0 ? (
            <p className="text-sm text-muted tabular-nums sm:ml-auto">
              {plural(unsold, "zone")} with no price, not sold hourly
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="relative isolate max-h-[70vh] overflow-auto overscroll-x-contain border-b border-hairline">
        <table className="w-full border-separate border-spacing-0 text-sm">
          {/* Raised in the list's own stacking (`isolate`), so it stays under the console's top bar. */}
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
                  className={cx(LEAD_HEADING, "px-3 text-right")}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownZones.map((zone) =>
              HOURLY_PACKAGES.map((size, index) => {
                const line =
                  index === HOURLY_PACKAGES.length - 1 &&
                  "border-b border-hairline";
                const key = coversKey(zone.id, size);
                // A duration with no price is not stored, nor how long it
                // covers: its hours wait for a price.
                const priced = classes.some(
                  (column) =>
                    senOf(values.prices[priceKey(zone.id, size, column.id)]) !==
                    null,
                );
                return (
                  <tr key={key}>
                    {index === 0 ? (
                      <th
                        scope="rowgroup"
                        rowSpan={HOURLY_PACKAGES.length}
                        className="border-b border-hairline py-3.5 pr-3 pl-5 text-left align-top font-normal"
                      >
                        <span className={ZONE_NAME}>{zone.name}</span>
                      </th>
                    ) : null}
                    <th
                      scope="row"
                      className={cx(
                        "px-3 py-0 text-left align-middle font-normal whitespace-nowrap text-body",
                        line,
                      )}
                    >
                      {durationLabel(size)}
                    </th>
                    <td className={cx(CELL_PAD, "w-24", line)}>
                      {readOnly ? (
                        <span className="block h-9 px-2.5 text-right leading-9 tabular-nums">
                          {values.covers[key]}
                        </span>
                      ) : (
                        <input
                          aria-label={`Hours ${durationLabel(size)} covers from ${zone.name}`}
                          title={priced ? undefined : "Price a class first"}
                          disabled={!priced}
                          aria-invalid={invalid.has(key) || undefined}
                          inputMode="numeric"
                          autoComplete="off"
                          readOnly={pending}
                          value={values.covers[key] ?? ""}
                          onChange={(event) =>
                            edit("covers", key, event.target.value)
                          }
                          onFocus={(event) => event.target.select()}
                          className={cx(
                            CELL_INPUT,
                            "min-w-16",
                            invalid.has(key)
                              ? CELL_BAD
                              : values.covers[key]?.trim() !==
                                  saved.covers[key]?.trim()
                                ? CELL_CHANGED
                                : CELL_PLAIN,
                          )}
                        />
                      )}
                    </td>
                    {classes.map((column) =>
                      priceCell(
                        "prices",
                        priceKey(zone.id, size, column.id),
                        `From ${zone.name}, ${durationLabel(size)}, ${column.name}`,
                        line,
                      ),
                    )}
                  </tr>
                );
              }),
            )}
          </tbody>
          <tbody>
            <tr>
              <th
                scope="colgroup"
                colSpan={classes.length + 3}
                className="border-b border-hairline bg-shade py-2.5 pr-3 pl-5 text-left text-2xs font-semibold tracking-caps text-body uppercase"
              >
                Extra hour, from every zone
              </th>
            </tr>
            {HOURLY_PACKAGES.map((size, index) => {
              const line =
                index < HOURLY_PACKAGES.length - 1 &&
                "border-b border-hairline";
              return (
                <tr key={size}>
                  <th
                    scope="row"
                    colSpan={3}
                    className={cx(
                      "py-0 pr-3 pl-5 text-left align-middle font-normal whitespace-nowrap text-body",
                      line,
                    )}
                  >
                    After {durationLabel(size)}
                  </th>
                  {classes.map((column) =>
                    priceCell(
                      "extras",
                      extraKey(size, column.id),
                      `Extra hour after ${durationLabel(size)}, ${column.name}`,
                      line,
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 px-5 py-4 text-xs text-muted">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <CellKey swatch={cx("border-edge", EMPTY_CELL)}>
            Empty: the class is not sold for the duration from the zone
          </CellKey>
          {readOnly ? null : (
            <CellKey swatch="border-brand bg-brand-tint">
              Changed, not saved
            </CellKey>
          )}
        </p>
        <p className="leading-relaxed">
          A pickup in a zone pays its row. One outside every zone pays the row
          of its nearest zone with a price, plus its road to that zone past the
          free km on Trip rules, at the class&apos;s rate per extra km.
          &quot;Covers&quot; is how long the duration runs from the zone: 4
          hours from the port cruise covers 5, say; the extra hours count from
          there.
        </p>
      </div>

      {readOnly ? null : (
        <>
          <SaveBar
            dirty={dirty}
            pending={pending}
            status={status}
            canSave={invalid.size === 0}
            onDiscard={() => {
              setValues(saved);
              setError(null);
            }}
            onSave={save}
            label="Save hourly rates"
          />
          {leaveDialog}
        </>
      )}
    </>
  );
}
