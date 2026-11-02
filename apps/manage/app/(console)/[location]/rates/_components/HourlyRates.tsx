"use client";

import {
  HOURLY_LIMITS,
  HOURLY_PACKAGES,
  packageLabel,
  parseRinggit,
  plural,
  ringgitInputValue,
  type HourlyList,
  type HourlyPackageHours,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { Checkbox, Input } from "@repo/ui/field";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from "@repo/ui/icons";
import { toast } from "@repo/ui/toast";
import { errorOf } from "@repo/console/action-state";
import { useLeaveGuard } from "@repo/console/use-leave-guard";
import { useState, useTransition } from "react";
import { setHourlyListAction } from "./actions";
import {
  CELL_BAD,
  CELL_CHANGED,
  CELL_INPUT,
  CELL_PAD,
  CELL_PLAIN,
  CellKey,
  EMPTY_CELL,
} from "./cells";

type Zone = { id: string; name: string };
/** A column: a class on sale here, with the category it is sold under. */
type ClassColumn = { id: string; name: string; category: string };

/** One area as the page holds it, each value as its input shows it. */
type AreaDraft = {
  /** Keeps the area's rows while they are moved. */
  key: string;
  name: string;
  zoneIds: string[];
  /** The hours each package covers from here, by package size. */
  covers: Record<HourlyPackageHours, string>;
  /** Prices by `priceKey`, in ringgit as typed. */
  prices: Record<string, string>;
};

type Draft = {
  areas: AreaDraft[];
  /** Extra hour rates by `priceKey`. */
  extras: Record<string, string>;
};

const priceKey = (size: HourlyPackageHours, classId: string) =>
  `${size}|${classId}`;

let lastKey = 0;
const nextKey = () => `area-${(lastKey += 1)}`;

function draftOf(list: HourlyList): Draft {
  return {
    areas: list.areas.map((area) => {
      const covers = Object.fromEntries(
        HOURLY_PACKAGES.map((size) => [size, String(size)]),
      ) as Record<HourlyPackageHours, string>;
      const prices: Record<string, string> = {};
      for (const row of area.packages) {
        covers[row.hours] = String(row.includedHours);
        for (const [classId, sen] of Object.entries(row.prices)) {
          prices[priceKey(row.hours, classId)] = ringgitInputValue(sen);
        }
      }
      return {
        key: nextKey(),
        name: area.name,
        zoneIds: [...area.zoneIds],
        covers,
        prices,
      };
    }),
    extras: Object.fromEntries(
      list.extras.map((extra) => [
        priceKey(extra.packageHours, extra.vehicleClassId),
        ringgitInputValue(extra.priceSen),
      ]),
    ),
  };
}

function newArea(): AreaDraft {
  return {
    key: nextKey(),
    name: "",
    zoneIds: [],
    covers: Object.fromEntries(
      HOURLY_PACKAGES.map((size) => [size, String(size)]),
    ) as Record<HourlyPackageHours, string>,
    prices: {},
  };
}

/** A price cell's text: a price, empty, or not a price. */
function readPrice(text: string | undefined): "empty" | "bad" | number {
  const trimmed = (text ?? "").trim();
  if (trimmed === "") return "empty";
  return parseRinggit(trimmed) ?? "bad";
}

/** "80" kept as "80.00"; anything else as typed. */
function tidy(text: string) {
  const read = readPrice(text);
  return typeof read === "number" ? ringgitInputValue(read) : text.trim();
}

/** The draft as the action reads it (`parseHourlyList`). */
function postedOf(draft: Draft, classes: readonly ClassColumn[]) {
  return {
    areas: draft.areas.map((area) => ({
      name: area.name,
      zoneIds: area.zoneIds,
      packages: HOURLY_PACKAGES.map((size) => ({
        hours: size,
        includedHours: Number(area.covers[size]),
        prices: classes.map((column) => ({
          vehicleClassId: column.id,
          price: area.prices[priceKey(size, column.id)] ?? "",
        })),
      })),
    })),
    extras: HOURLY_PACKAGES.flatMap((size) =>
      classes.map((column) => ({
        packageHours: size,
        vehicleClassId: column.id,
        price: draft.extras[priceKey(size, column.id)] ?? "",
      })),
    ),
  };
}

/** Whether the hours a package covers are a whole number it may cover. */
const coversOk = (text: string) => {
  const n = Number(text);
  const { min, max } = HOURLY_LIMITS.includedHours;
  return /^\d+$/.test(text.trim()) && n >= min && n <= max;
};

/**
 * A location's hourly price list, as Operation keeps it: its hourly areas,
 * each a group of its zones a pickup is priced alike from; for each area
 * the 4, 8 and 12-hour packages, the hours each covers there, and its
 * price per class; then the rate per extra hour for each package size,
 * the same from every area. An empty price is not sold, and a package with
 * no price in any class is not sold from the area. Saved whole. Read only
 * for the teams that read the rates. See docs/261102-booking-ops.md.
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
  const [saved, setSaved] = useState<Draft>(() => draftOf(list));
  const [draft, setDraft] = useState<Draft>(saved);
  const [error, setError] = useState<string | null>(null);
  /** The area whose zones are being chosen, by key. */
  const [choosing, setChoosing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const savedPosted = JSON.stringify(postedOf(saved, classes));
  const posted = postedOf(draft, classes);
  const dirty = JSON.stringify(posted) !== savedPosted;
  const leaveDialog = useLeaveGuard(
    dirty,
    "The hourly prices changed since the last save are lost.",
  );

  const allPrices = [
    ...draft.areas.flatMap((area) => Object.values(area.prices)),
    ...Object.values(draft.extras),
  ];
  const badPrices = allPrices.filter(
    (text) => readPrice(text) === "bad",
  ).length;
  const badCovers = draft.areas.flatMap((area) =>
    HOURLY_PACKAGES.filter((size) => !coversOk(area.covers[size])),
  ).length;
  const nameless = draft.areas.filter((area) => !area.name.trim()).length;
  const zoneless = draft.areas.filter(
    (area) => area.zoneIds.length === 0,
  ).length;

  let problem: string | null = null;
  if (badPrices > 0) {
    problem = `${badPrices === 1 ? "One cell is" : `${badPrices} cells are`} not a price. Enter RM with at most two decimals, or clear ${badPrices === 1 ? "it" : "them"}.`;
  } else if (badCovers > 0) {
    problem = `A package covers ${HOURLY_LIMITS.includedHours.min} to ${HOURLY_LIMITS.includedHours.max} whole hours.`;
  } else if (nameless > 0) {
    problem = "Every area needs a name.";
  } else if (zoneless > 0) {
    problem = "Choose at least one zone for every area.";
  }

  const zoneName = new Map(zones.map((zone) => [zone.id, zone.name]));
  const areaOfZone = new Map(
    draft.areas.flatMap((area) =>
      area.zoneIds.map((id) => [id, area] as const),
    ),
  );
  const unplaced = zones.filter((zone) => !areaOfZone.has(zone.id));

  function changeArea(key: string, change: (area: AreaDraft) => AreaDraft) {
    setError(null);
    setDraft((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.key === key ? change(area) : area,
      ),
    }));
  }

  function moveArea(index: number, by: -1 | 1) {
    setDraft((current) => {
      const areas = [...current.areas];
      const [moved] = areas.splice(index, 1);
      areas.splice(index + by, 0, moved!);
      return { ...current, areas };
    });
  }

  function removeArea(key: string) {
    setError(null);
    setDraft((current) => ({
      ...current,
      areas: current.areas.filter((area) => area.key !== key),
    }));
  }

  function addArea() {
    const area = newArea();
    setDraft((current) => ({ ...current, areas: [...current.areas, area] }));
    setChoosing(area.key);
  }

  function save() {
    if (problem) return;
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(setHourlyListAction(locationId, posted)),
      );
      if (refused) {
        setError(refused);
        return;
      }
      setSaved(draft);
      setError(null);
      toast.success("Hourly rates saved.");
    });
  }

  /** A price cell, coloured by its state against the save. */
  function priceCell(
    key: string,
    label: string,
    value: string | undefined,
    savedValue: string | undefined,
    onChange: (text: string) => void,
  ) {
    const text = value ?? "";
    if (readOnly) {
      const read = readPrice(text);
      return (
        <td key={key} className={cx(CELL_PAD, "text-right tabular-nums")}>
          {typeof read === "number" ? (
            ringgitInputValue(read)
          ) : (
            <span className="text-muted">–</span>
          )}
        </td>
      );
    }
    const read = readPrice(text);
    const was = readPrice(savedValue);
    return (
      <td key={key} className={CELL_PAD}>
        <input
          aria-label={label}
          inputMode="decimal"
          value={text}
          readOnly={pending}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onChange(tidy(event.target.value))}
          className={cx(
            CELL_INPUT,
            read === "bad"
              ? CELL_BAD
              : read !== was
                ? CELL_CHANGED
                : CELL_PLAIN,
            read === "empty" && EMPTY_CELL,
          )}
        />
      </td>
    );
  }

  const savedArea = (key: string) =>
    saved.areas.find((area) => area.key === key);
  const columns = classes.length + 2;
  const chosenArea = draft.areas.find((area) => area.key === choosing);

  if (zones.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-muted">
        Draw this location&apos;s zones on Coverage first: an hourly area is a
        group of them.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b border-hairline py-2.5 pr-3 pl-5 text-left font-medium text-muted"
              >
                Package
              </th>
              <th
                scope="col"
                className="border-b border-hairline px-3 py-2.5 text-right font-medium text-muted"
              >
                Covers (h)
              </th>
              {classes.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="border-b border-hairline px-3 py-2.5 text-right align-bottom"
                >
                  <span className="block font-semibold text-ink">
                    {column.name}
                  </span>
                  <span className="block text-caption font-normal text-muted">
                    {column.category}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {draft.areas.map((area, index) => (
            <tbody key={area.key}>
              <tr>
                <td
                  colSpan={columns}
                  className="border-t border-hairline bg-shade px-5 py-3"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {readOnly ? (
                      <span className="font-semibold text-ink">
                        {area.name}
                      </span>
                    ) : (
                      <Input
                        aria-label="Area name"
                        placeholder="Area name, such as Kuah Town / Beach"
                        value={area.name}
                        maxLength={HOURLY_LIMITS.areaNameLength}
                        readOnly={pending}
                        onChange={(event) =>
                          changeArea(area.key, (a) => ({
                            ...a,
                            name: event.target.value,
                          }))
                        }
                        className="max-w-80"
                      />
                    )}
                    <span className="min-w-0 flex-1 text-caption text-muted">
                      {area.zoneIds.length > 0
                        ? area.zoneIds
                            .map((id) => zoneName.get(id) ?? "A removed zone")
                            .join(", ")
                        : "No zone yet"}
                    </span>
                    {readOnly ? null : (
                      <span className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pending}
                          onClick={() => setChoosing(area.key)}
                        >
                          Zones
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${area.name || "the area"} up`}
                          disabled={pending || index === 0}
                          onClick={() => moveArea(index, -1)}
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${area.name || "the area"} down`}
                          disabled={pending || index === draft.areas.length - 1}
                          onClick={() => moveArea(index, 1)}
                        >
                          <ArrowDownIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${area.name || "the area"}`}
                          disabled={pending}
                          onClick={() => removeArea(area.key)}
                        >
                          <TrashIcon />
                        </Button>
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              {HOURLY_PACKAGES.map((size) => (
                <tr key={size}>
                  <th
                    scope="row"
                    className="py-1.5 pr-3 pl-5 text-left font-medium whitespace-nowrap text-body"
                  >
                    {packageLabel(size)}
                  </th>
                  <td className={cx(CELL_PAD, "w-24")}>
                    {readOnly ? (
                      <span className="block text-right tabular-nums">
                        {area.covers[size]}
                      </span>
                    ) : (
                      <input
                        aria-label={`Hours the ${packageLabel(size)} covers from ${area.name || "the area"}`}
                        inputMode="numeric"
                        value={area.covers[size]}
                        readOnly={pending}
                        onChange={(event) =>
                          changeArea(area.key, (a) => ({
                            ...a,
                            covers: { ...a.covers, [size]: event.target.value },
                          }))
                        }
                        className={cx(
                          CELL_INPUT,
                          "min-w-16",
                          !coversOk(area.covers[size])
                            ? CELL_BAD
                            : area.covers[size] !==
                                (savedArea(area.key)?.covers[size] ??
                                  String(size))
                              ? CELL_CHANGED
                              : CELL_PLAIN,
                        )}
                      />
                    )}
                  </td>
                  {classes.map((column) => {
                    const key = priceKey(size, column.id);
                    return priceCell(
                      column.id,
                      `${area.name || "The area"}, ${packageLabel(size)}, ${column.name}`,
                      area.prices[key],
                      savedArea(area.key)?.prices[key],
                      (text) =>
                        changeArea(area.key, (a) => ({
                          ...a,
                          prices: { ...a.prices, [key]: text },
                        })),
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
          <tbody>
            <tr>
              <td
                colSpan={columns}
                className="border-t border-hairline bg-shade px-5 py-3 font-semibold text-ink"
              >
                Extra hour, from every area
              </td>
            </tr>
            {HOURLY_PACKAGES.map((size) => (
              <tr key={size}>
                <th
                  scope="row"
                  colSpan={2}
                  className="py-1.5 pr-3 pl-5 text-left font-medium whitespace-nowrap text-body"
                >
                  After the {packageLabel(size)}
                </th>
                {classes.map((column) => {
                  const key = priceKey(size, column.id);
                  return priceCell(
                    column.id,
                    `Extra hour after the ${packageLabel(size)}, ${column.name}`,
                    draft.extras[key],
                    saved.extras[key],
                    (text) => {
                      setError(null);
                      setDraft((current) => ({
                        ...current,
                        extras: { ...current.extras, [key]: text },
                      }));
                    },
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 border-t border-hairline px-5 py-4 text-xs text-muted">
        <p className="flex flex-wrap gap-x-5 gap-y-2">
          <CellKey swatch={cx(CELL_PLAIN, EMPTY_CELL)}>
            Empty: not sold in the class
          </CellKey>
          {readOnly ? null : (
            <CellKey swatch={CELL_CHANGED}>Changed since the save</CellKey>
          )}
        </p>
        <p className="leading-relaxed">
          A pickup is priced from the area its zone is in, or its nearest
          zone&apos;s when it is outside them all. The customer picks a package
          and any extra hours; &quot;Covers&quot; is how long the package runs
          from the area, the port cruise&apos;s 4-hour package 5, say.
          {unplaced.length > 0
            ? ` In no area, so not sold hourly: ${unplaced.map((zone) => zone.name).join(", ")}.`
            : null}
        </p>
      </div>

      {readOnly ? null : (
        <>
          <div className="border-t border-hairline px-5 py-3">
            <Button variant="secondary" disabled={pending} onClick={addArea}>
              <PlusIcon />
              Add area
            </Button>
          </div>
          <div
            className={cx(
              "z-(--layer-sticky) flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-card px-5 py-3 md:sticky md:bottom-0",
              dirty
                ? "bg-navy text-white shadow-band"
                : "border-t border-hairline bg-white",
            )}
          >
            <p
              aria-live="polite"
              className={cx(
                "min-w-0 text-sm",
                (error ?? problem)
                  ? dirty
                    ? "font-semibold text-danger-edge"
                    : "text-danger"
                  : dirty
                    ? "font-semibold"
                    : "text-muted",
              )}
            >
              {pending
                ? "Saving…"
                : (error ??
                  problem ??
                  (dirty ? "Unsaved changes." : "No unsaved changes."))}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {dirty ? (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setDraft(saved);
                    setError(null);
                  }}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  Discard
                </Button>
              ) : null}
              <Button
                variant={dirty ? "secondary" : "primary"}
                disabled={!dirty || problem !== null}
                pending={pending}
                onClick={save}
              >
                {pending ? "Saving…" : "Save hourly rates"}
              </Button>
            </div>
          </div>
          {leaveDialog}
          {chosenArea ? (
            <ZonesDialog
              key={chosenArea.key}
              area={chosenArea}
              zones={zones}
              takenBy={(id) => {
                const other = areaOfZone.get(id);
                return other && other.key !== chosenArea.key
                  ? other.name || "another area"
                  : null;
              }}
              onClose={() => setChoosing(null)}
              onChoose={(zoneIds) => {
                changeArea(chosenArea.key, (a) => ({ ...a, zoneIds }));
                setChoosing(null);
              }}
            />
          ) : null}
        </>
      )}
    </>
  );
}

/** The zones of an area, ticked from the location's; a zone in another area is shown with its name and cannot be ticked. */
function ZonesDialog({
  area,
  zones,
  takenBy,
  onClose,
  onChoose,
}: {
  area: AreaDraft;
  zones: Zone[];
  takenBy: (zoneId: string) => string | null;
  onClose: () => void;
  onChoose: (zoneIds: string[]) => void;
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(
    () => new Set(area.zoneIds),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={area.name ? `Zones of ${area.name}` : "Zones of the area"}
      description="A pickup in a ticked zone is priced from this area. A zone is in one area at most."
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <p className="text-sm font-medium text-body">
            {plural(ticked.size, "zone")} ticked
          </p>
          <ul className="grid max-h-80 gap-1 overflow-y-auto">
            {zones.map((zone) => {
              const other = takenBy(zone.id);
              return (
                <li key={zone.id}>
                  <label
                    className={cx(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
                      other ? "text-muted" : "hover:bg-mist",
                    )}
                  >
                    <Checkbox
                      checked={ticked.has(zone.id)}
                      disabled={other !== null}
                      onChange={(event) =>
                        setTicked((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(zone.id);
                          else next.delete(zone.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1">{zone.name}</span>
                    {other ? (
                      <span className="text-caption">In {other}</span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onChoose(zones.filter((z) => ticked.has(z.id)).map((z) => z.id))
            }
          >
            Use these zones
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
