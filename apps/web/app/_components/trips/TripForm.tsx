"use client";

import type { ReactNode } from "react";
import {
  TRIP_MODE_LABELS,
  TRIP_MODES,
  type BBox,
  type TripCategory,
  type TripMode,
} from "@repo/db";
import { Radio } from "@repo/ui/field";
import {
  ArrowRightIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@repo/ui/icons";
import type { PlacePresets } from "@repo/ui/place-input";
import { focus, secondaryButton } from "../../(site)/_components/Page";
import {
  fieldKeys,
  PRODUCTS,
  visibleFields,
  type FieldDef,
  type FieldKey,
  type SearchValues,
} from "../../_lib/search";
import { FieldIcon, FieldInput } from "../search/fields";
import { TripNumber } from "./TripTimeline";
import type { Planner } from "./usePlanner";

const MODE_ICONS: Record<TripMode, typeof ClockIcon> = {
  oneway: ArrowRightIcon,
  hourly: ClockIcon,
};

const input = (clearable: boolean) =>
  `h-full min-h-[70px] w-full border-0 bg-transparent pt-[34px] pb-2.5 pl-[18px] text-slate-500 outline-none placeholder:text-slate-500/80 focus:text-ink data-placeholder:text-slate-500/80 ${
    clearable ? "pr-11" : "pr-[18px]"
  }`;

const textButton = `inline-flex min-h-[48px] items-center gap-1.5 px-1 text-[0.95rem] font-semibold hover:underline ${focus}`;

/** Whether a field shows its ×: a place or a day with something in it. */
function isClearable(def: FieldDef, values: SearchValues) {
  if (def.kind !== "place" && def.kind !== "when") return false;
  return fieldKeys(def).some((key) => values[key] !== "");
}

/**
 * The trip form: the kind of trip as two radios in the row's first box,
 * then the places, the hours of a hire and when, in one row of boxes
 * joined up when there is room, as the home page card asks a trip. A new
 * trip is added to the list with "Add trip", and the form empties for the
 * next; a trip of the list is saved, or removed. What is wrong shows at
 * the field and under the row: a field to fill, or a trip that starts
 * during another, naming it and what to do. `children` follow the form's
 * own buttons, such as the search card's passengers and send button.
 * Each label leads with its field's icon, and a filled place or day has
 * an × at its end that empties it.
 */
export function TripForm({
  planner,
  category,
  presetsOf,
  near,
  children,
}: {
  planner: Planner;
  category: TripCategory;
  /** What a place field offers when it is opened empty. */
  presetsOf?: (key: FieldKey) => PlacePresets | undefined;
  /** The box whose places the place fields suggest first. */
  near?: BBox;
  children?: ReactNode;
}) {
  const { scope, form, editing, issues, clashNotes, keepOpen, numberOf } =
    planner;
  if (!form) return null;
  const { values } = form;
  const fields = visibleFields(PRODUCTS[category], values).filter(
    (f) => f.key !== "mode",
  );
  const id = (key: string) => `${scope}-${key}`;
  const messages = [
    ...new Set([...issues.map((x) => x.message), ...clashNotes]),
  ];

  /** Empties the field, a day and its time together, and puts the cursor back in it. */
  function clear(def: FieldDef) {
    for (const key of fieldKeys(def)) planner.set(key, "");
    document.getElementById(id(def.key))?.focus();
  }

  return (
    <div className="@container">
      {planner.trips.length > 0 ? (
        <div className="mx-1 mb-3 flex items-center gap-2.5">
          {editing ? (
            <TripNumber value={numberOf(editing)} />
          ) : (
            <span className="grid size-6 place-items-center rounded-full bg-brand-tint text-brand">
              <PlusIcon className="size-4" />
            </span>
          )}
          <p className="font-bold text-ink">
            {editing ? `Change trip ${numberOf(editing)}` : "Add a trip"}
          </p>
        </div>
      ) : null}

      <div
        key={form.key}
        className="grid gap-2.5 @lg:grid-cols-2 @3xl:flex @3xl:gap-0"
      >
        <fieldset className="flex min-h-[70px] min-w-0 flex-col justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 @3xl:w-[150px] @3xl:shrink-0 @3xl:rounded-none @3xl:rounded-l-[14px]">
          <legend className="sr-only">Type of trip</legend>
          {TRIP_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode];
            return (
              <label
                key={mode}
                className="flex cursor-pointer items-center gap-2 text-[0.9rem]/5 font-semibold whitespace-nowrap text-slate-600 hover:text-ink has-[:checked]:text-brand"
              >
                <Radio
                  name={id("mode")}
                  value={mode}
                  checked={values.mode === mode}
                  onChange={() => planner.set("mode", mode)}
                />
                <Icon className="size-4 shrink-0" />
                {TRIP_MODE_LABELS[mode]}
              </label>
            );
          })}
        </fieldset>
        {fields.map((f, i) => {
          const keys = fieldKeys(f);
          const invalid =
            issues.some((x) => keys.some((key) => key === x.field)) ||
            (f.kind === "when" && clashNotes.length > 0);
          const clearable = isClearable(f, values);
          const last = i === fields.length - 1;
          // The field fills its box, its label laid over the top of it: a
          // click anywhere in the box reaches the field, and its list or
          // calendar opens under the box, lined up with its edges.
          return (
            <div
              key={f.key}
              className={`relative grid min-w-0 grid-cols-1 rounded-xl border bg-white focus-within:z-10 focus-within:border-brand @3xl:-ml-px @3xl:rounded-none ${
                invalid ? "z-[1] border-[#b3261e]" : "border-slate-200"
              } ${last ? "@3xl:rounded-r-[14px]" : ""} ${
                f.kind === "place"
                  ? "@3xl:flex-[2]"
                  : f.kind === "when"
                    ? "@3xl:flex-[1.5]"
                    : "@3xl:flex-1"
              }`}
            >
              <label
                htmlFor={id(f.key)}
                className="pointer-events-none absolute top-2.5 left-[18px] z-[1] flex items-center gap-1.5 text-[0.82rem]/5 font-semibold text-slate-800"
              >
                <FieldIcon def={f} className="size-[15px] text-slate-500" />
                {f.label}
              </label>
              <FieldInput
                def={f}
                id={id(f.key)}
                values={values}
                presets={presetsOf?.(f.key)}
                near={near}
                onChange={planner.set}
                className={input(clearable)}
              />
              {clearable && (
                <button
                  type="button"
                  aria-label={`Clear ${f.label}`}
                  onClick={() => clear(f)}
                  className={`absolute right-2.5 bottom-[11px] z-[1] flex size-7 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink ${focus}`}
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {messages.length > 0 ? (
        <p role="alert" className="mx-1 mt-3 text-[0.92rem] text-[#b3261e]">
          {messages.join(" ")}
        </p>
      ) : null}

      <div className="mx-1 mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        {editing ? (
          <>
            <button
              type="button"
              onClick={planner.commit}
              className={secondaryButton}
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={planner.close}
              className={`${textButton} text-slate-600`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={planner.remove}
              className={`${textButton} text-[#b3261e]`}
            >
              <TrashIcon className="size-4" />
              Remove trip
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={planner.commit}
              className={`${secondaryButton} gap-2`}
            >
              <PlusIcon className="size-4" />
              Add trip
            </button>
            {keepOpen ? null : (
              <button
                type="button"
                onClick={planner.close}
                className={`${textButton} text-slate-600`}
              >
                Cancel
              </button>
            )}
          </>
        )}
        {children}
      </div>
    </div>
  );
}
