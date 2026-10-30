"use client";

import type { ReactNode } from "react";
import type { BBox, TripCategory } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Radio } from "@repo/ui/field";
import { PlusIcon, TrashIcon, XIcon } from "@repo/ui/icons";
import type { PlacePresets } from "@repo/ui/place-input";
import {
  fieldKeys,
  PRODUCTS,
  visibleFields,
  type FieldDef,
  type FieldKey,
  type SearchValues,
} from "../../_lib/search";
import {
  fieldBox,
  fieldControl,
  FieldIcon,
  FieldInput,
  fieldLabel,
  fieldRing,
} from "../search/fields";
import { TripNumber } from "./TripTimeline";
import type { Planner } from "./usePlanner";

/** Save: the full width of a narrow form, beside Cancel in a wide one. */
const save = "w-full @3xl:w-auto";

/**
 * Cancel and Remove: words at a button's height, side by side under Save
 * in a narrow form, after it in a wide one.
 */
const textButton =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 px-1 text-copy font-semibold hover:underline focus-ring @3xl:flex-none";

/** Whether a field shows its ×: a place or a day with something in it. */
function isClearable(def: FieldDef, values: SearchValues) {
  if (def.kind !== "place" && def.kind !== "when") return false;
  return fieldKeys(def).some((key) => values[key] !== "");
}

/** "Add another trip": opens a new trip in the form. */
export function AddAnotherTrip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-1 inline-flex min-h-11 items-center gap-1.5 text-copy font-semibold text-brand hover:underline focus-ring"
    >
      <PlusIcon className="size-4" />
      Add another trip
    </button>
  );
}

/**
 * The trip form: "Trip 2" over it once there are trips, then the kind of
 * trip as two radios side by side, the places, the hours of a hire and
 * when, each in a box with its label over the top, joined up in one row
 * when there is room, as the home page card asks a trip. A new trip is
 * kept with "Save trip", a trip of the list saved or removed; with no
 * trips yet the form is the first trip, and "Add another trip" keeps it
 * and opens the next. What is wrong shows at the field and under the
 * row: a field to fill, or a trip that starts during another, naming it
 * and what to do. `children` follow the form's buttons, such as the
 * group's size and the send button. The kind of trip's label leads with
 * the arrow or, for a hire, the clock; each other label with its field's
 * icon, and a filled place or day has an × at its end that empties it.
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
  /** After the form's buttons, such as the group's size and the send button. */
  children?: ReactNode;
}) {
  const { scope, form, editing, issues, clashNotes, numberOf } = planner;
  if (!form) return null;
  const { values } = form;
  const all = visibleFields(PRODUCTS[category], values);
  const kind = all.find((f) => f.key === "mode");
  const fields = all.filter((f) => f !== kind);
  const id = (key: string) => `${scope}-${key}`;
  const messages = [
    ...new Set([...issues.map((x) => x.message), ...clashNotes]),
  ];
  /** The line under the row that says what is wrong, which a refused field points at. */
  const messagesId = id("issues");

  /** Empties the field, a day and its time together, and puts the cursor back in it. */
  function clear(def: FieldDef) {
    for (const key of fieldKeys(def)) planner.set(key, "");
    document.getElementById(id(def.key))?.focus();
  }

  return (
    <div className="@container">
      {planner.trips.length > 0 ? (
        <div className="mx-1 mb-3 flex items-center gap-2.5">
          <TripNumber
            value={editing ? numberOf(editing) : planner.trips.length + 1}
          />
          <p className="font-bold text-ink">
            {editing
              ? `Change trip ${numberOf(editing)}`
              : `Trip ${planner.trips.length + 1}`}
          </p>
        </div>
      ) : null}

      <div
        key={form.key}
        className="grid gap-2.5 @lg:grid-cols-2 @3xl:flex @3xl:gap-0"
      >
        {kind ? (
          <div
            role="radiogroup"
            aria-labelledby={id(kind.key)}
            className={`${fieldBox} border-card-edge @3xl:w-[240px] @3xl:shrink-0 @3xl:rounded-none @3xl:rounded-l-control`}
          >
            <span id={id(kind.key)} className={fieldLabel}>
              <FieldIcon
                def={kind}
                values={values}
                className="size-[15px] text-muted"
              />
              {kind.label}
            </span>
            <div className="flex min-h-[70px] items-end gap-x-6 px-[18px] pt-[34px] pb-2.5">
              {kind.options?.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 text-base/6 font-semibold whitespace-nowrap text-muted hover:text-ink has-[:checked]:text-brand"
                >
                  <Radio
                    name={id(kind.key)}
                    value={value}
                    checked={values.mode === value}
                    onChange={() => planner.set(kind.key, value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
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
              className={`${fieldBox} ${fieldRing} @3xl:-ml-px @3xl:rounded-none ${
                invalid
                  ? "z-(--layer-raised) border-danger"
                  : "border-card-edge"
              } ${last ? "@3xl:rounded-r-control" : ""} ${
                f.kind === "place"
                  ? "@3xl:flex-[2]"
                  : f.kind === "when"
                    ? "@3xl:flex-[1.5]"
                    : "@3xl:flex-1"
              }`}
            >
              <label htmlFor={id(f.key)} className={fieldLabel}>
                <FieldIcon def={f} className="size-[15px] text-muted" />
                {f.label}
              </label>
              <FieldInput
                def={f}
                id={id(f.key)}
                values={values}
                presets={presetsOf?.(f.key)}
                near={near}
                onChange={planner.set}
                invalid={invalid}
                describedBy={invalid ? messagesId : undefined}
                className={fieldControl(clearable)}
              />
              {clearable && (
                <button
                  type="button"
                  aria-label={`Clear ${f.label}`}
                  onClick={() => clear(f)}
                  className="absolute right-2.5 bottom-[11px] z-(--layer-raised) flex size-7 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-hairline hover:text-ink focus-ring"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {messages.length > 0 ? (
        <p
          id={messagesId}
          role="alert"
          className="mx-1 mt-3 text-copy text-danger"
        >
          {messages.join(" ")}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {editing ? (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={planner.commit}
              className={save}
            >
              Save changes
            </Button>
            <button
              type="button"
              onClick={planner.close}
              className={`${textButton} text-muted`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={planner.remove}
              className={`${textButton} text-danger`}
            >
              <TrashIcon className="size-4" />
              Remove trip
            </button>
          </>
        ) : planner.trips.length > 0 ? (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={planner.commit}
              className={save}
            >
              Save trip
            </Button>
            <button
              type="button"
              onClick={planner.close}
              className={`${textButton} text-muted`}
            >
              Cancel
            </button>
          </>
        ) : (
          // The first trip: kept, and the next opened.
          <AddAnotherTrip
            onClick={() => {
              if (planner.commit()) planner.openNew();
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
