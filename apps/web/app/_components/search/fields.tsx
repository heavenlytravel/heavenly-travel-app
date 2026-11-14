"use client";

import type { ReactNode } from "react";
import { BOOKING_RULES, type BBox } from "@repo/db";
import {
  DateField,
  DateTimeField,
  type OddHoursMark,
} from "@repo/ui/date-field";
import {
  ArrowRightIcon,
  BedIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  MapPinIcon,
  UsersIcon,
  XIcon,
} from "@repo/ui/icons";
import { Checkbox, Radio } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { PlaceInput, type PlacePresets } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import {
  fieldKeys,
  isPlaceKey,
  type FieldDef,
  type FieldKey,
  type SearchValues,
} from "../../_lib/search";

const MAX_COUNT = 99;
const { timeZone } = BOOKING_RULES;

/**
 * The night hours the pickers tag "Odd Hours": a fixed guide, the same in
 * every location, since a search does not know its location's window yet.
 * The price, read from the location's rules, is what holds.
 */
const ODD_HOURS: OddHoursMark = {
  from: 23 * 60,
  to: 7 * 60,
  note: "Odd hours are usually 23:00–07:00. Times can differ by location, and your price shows any surcharge before you book.",
};

/**
 * The right input for a field. Each search box styles it its own way, but
 * what a date, a time or a place needs stays the same: the pickers come
 * from @repo/ui without a box of their own, so `className` draws it. A
 * day and a time are one field that sets two values, so `onChange` names
 * the value it sets. A place field is an autocomplete: `onChange` gets the
 * place id when a suggestion is picked, and none when the text was typed.
 * `presets` are the places a place field offers before anything is
 * typed, `near` the box whose places it suggests first. Days and times
 * are read in Malaysia, where the trip happens. A day has no icon in its
 * box: the label carries the field's icon (`FieldIcon`). `invalid` marks a
 * field the form refused and `describedBy` ties it to the line that says
 * why, on the controls that take them: a count and a text. The place
 * field and the pickers of @repo/ui take neither yet.
 */
export function FieldInput({
  def,
  id,
  values,
  presets,
  near,
  onChange,
  onFocus,
  invalid = false,
  describedBy,
  className,
}: {
  def: FieldDef;
  id: string;
  values: SearchValues;
  presets?: PlacePresets;
  near?: BBox;
  onChange: (key: FieldKey, value: string, placeId?: string) => void;
  onFocus?: () => void;
  /** The form refused the field. */
  invalid?: boolean;
  /** The id of the line that says why. */
  describedBy?: string;
  className?: string;
}) {
  if (def.kind === "place" && isPlaceKey(def.key)) {
    return (
      <PlaceInput
        id={id}
        value={values[def.key]}
        placeId={values.placeIds[def.key]}
        placeholder={def.placeholder}
        presets={presets}
        near={near}
        onChange={(value, placeId) => onChange(def.key, value, placeId)}
        onFocus={onFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={className}
      />
    );
  }
  // A return or a check-out cannot come before the start date.
  const min = def.key === "endDate" && values.date ? values.date : undefined;
  if (def.kind === "when" && def.timeKey) {
    const timeKey = def.timeKey;
    return (
      <DateTimeField
        id={id}
        bare
        title={def.label}
        value={{ date: values[def.key], time: values[timeKey] }}
        onChange={(next) => {
          if (next.date !== values[def.key]) onChange(def.key, next.date);
          if (next.time !== values[timeKey]) onChange(timeKey, next.time);
        }}
        min={min}
        timeZone={timeZone}
        oddHours={ODD_HOURS}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={className}
      />
    );
  }
  if (def.kind === "date") {
    return (
      <DateField
        id={id}
        bare
        aria-label={def.label}
        value={values[def.key]}
        onChange={(value) => onChange(def.key, value)}
        min={min}
        timeZone={timeZone}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={className}
      />
    );
  }
  if (def.kind === "choice") {
    return (
      <Select
        id={id}
        bare
        value={values[def.key]}
        onValueChange={(value) => onChange(def.key, value)}
        options={def.options ?? []}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={className}
      />
    );
  }
  if (def.kind === "count") {
    return (
      <NumberField
        id={id}
        bare
        min={def.min ?? 1}
        max={MAX_COUNT}
        value={values[def.key]}
        onChange={(e) => onChange(def.key, e.target.value)}
        onFocus={onFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={className}
      />
    );
  }
  return (
    <input
      id={id}
      value={values[def.key]}
      onChange={(e) => onChange(def.key, e.target.value)}
      onFocus={onFocus}
      placeholder={def.placeholder}
      autoComplete="off"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={className}
    />
  );
}

/** The icon each field's label leads with: what the field asks, at a glance. */
const FIELD_ICONS: Record<FieldKey, typeof MapPinIcon> = {
  mode: ArrowRightIcon,
  from: MapPinIcon,
  to: FlagIcon,
  place: MapPinIcon,
  date: CalendarIcon,
  endDate: CalendarIcon,
  time: ClockIcon,
  endTime: ClockIcon,
  days: CalendarIcon,
  duration: ClockIcon,
  elsewhere: FlagIcon,
  people: UsersIcon,
  children: UsersIcon,
  rooms: BedIcon,
};

/** A field's icon; the kind of trip's follows the choice, the clock for a hire. */
export function FieldIcon({
  def,
  values,
  className,
}: {
  def: FieldDef;
  values?: SearchValues;
  className?: string;
}) {
  const Icon =
    def.key === "mode" && values?.mode === "hourly"
      ? ClockIcon
      : FIELD_ICONS[def.key];
  return <Icon className={className} />;
}

/**
 * A field's box on the search card: the field fills it, its label laid over
 * its top. With the focus it reaches over the boxes after it, so its open
 * list of places is not covered by their raised labels.
 */
export const fieldBox =
  "relative grid min-w-0 grid-cols-1 rounded-xl border bg-white focus-within:z-(--layer-overlap) focus-within:border-brand";

/**
 * The keyboard's ring around a `fieldBox` whose field has the focus: the
 * field draws none of its own (`fieldControl`), so the box shows it, in
 * the site's ring, on its edge.
 */
export const fieldRing =
  "has-[:focus-visible]:outline-(length:--ring-width) has-[:focus-visible]:outline-ring";

/** The label laid over the top of a `fieldBox`, its icon leading. */
export const fieldLabel =
  "pointer-events-none absolute top-2.5 left-[18px] z-(--layer-raised) flex items-center gap-1.5 text-caption/5 font-semibold whitespace-nowrap text-body";

/**
 * A field filling its `fieldBox`, under the label: what is filled in ink,
 * the placeholder in muted. `clearable` leaves room for the × at its end.
 */
export const fieldControl = (clearable: boolean) =>
  `h-full min-h-[70px] w-full border-0 bg-transparent pt-[34px] pb-2.5 pl-[18px] text-ink outline-none placeholder:text-muted data-placeholder:text-muted ${
    clearable ? "pr-11" : "pr-[18px]"
  }`;

/** Whether a field shows its ×: a place or a day with something in it. */
function isClearable(def: FieldDef, values: SearchValues) {
  if (def.kind !== "place" && def.kind !== "when") return false;
  return fieldKeys(def).some((key) => values[key] !== "");
}

/**
 * The kind of trip in its box: two radios side by side under the label,
 * whose icon follows the choice. `badge` follows the label, such as the
 * trip's number; `textClassName` sizes the choices' words, and
 * `className` draws the box's edge and width where it sits.
 */
export function KindBox({
  def,
  id,
  values,
  onChange,
  badge,
  textClassName = "",
  className = "",
}: {
  def: FieldDef;
  /** The label's id, which also names the radios. */
  id: string;
  values: SearchValues;
  onChange: (key: FieldKey, value: string) => void;
  badge?: ReactNode;
  textClassName?: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={id}
      className={`${fieldBox} border-card-edge ${className}`}
    >
      <span id={id} className={fieldLabel}>
        <FieldIcon
          def={def}
          values={values}
          className="size-[15px] text-muted"
        />
        {def.label}
        {badge}
      </span>
      <div className="flex min-h-[70px] items-end gap-x-5 px-[18px] pt-[34px] pb-2.5">
        {def.options?.map(({ value, label }) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-2 text-base/6 font-semibold whitespace-nowrap text-muted hover:text-ink has-[:checked]:text-brand ${textClassName}`}
          >
            <Radio
              name={id}
              value={value}
              checked={values[def.key] === value}
              onChange={() => onChange(def.key, value)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * A field in its box, as the trip forms ask it: the field fills the box,
 * its label laid over the top, so a click anywhere in the box reaches the
 * field and its list or calendar opens under the box, lined up with its
 * edges. A field with a tick (`FieldDef.tick`) shows it after the label,
 * on its line, so the box keeps its height however wide it grows. A
 * filled place or day has an × at its end that empties it, a day and its
 * time together, and puts the cursor back in it. `invalid` draws the
 * box in red over its neighbours and `describedBy` ties the field to the
 * line that says why. `textClassName` sizes what is typed; `className`
 * draws the box's edge and width where it sits.
 */
export function FieldBox({
  def,
  id,
  values,
  onChange,
  presets,
  near,
  invalid = false,
  describedBy,
  textClassName = "",
  className = "",
}: {
  def: FieldDef;
  id: string;
  values: SearchValues;
  onChange: (key: FieldKey, value: string, placeId?: string) => void;
  /** What a place field offers when it is opened empty. */
  presets?: PlacePresets;
  /** The box whose places a place field suggests first. */
  near?: BBox;
  invalid?: boolean;
  describedBy?: string;
  textClassName?: string;
  className?: string;
}) {
  const clearable = isClearable(def, values);
  const tick = def.tick?.shown(values) ? def.tick : null;
  const label = def.label;
  return (
    <div
      className={`${fieldBox} ${fieldRing} ${
        invalid ? "z-(--layer-raised) border-danger" : "border-card-edge"
      } ${className}`}
    >
      {tick ? (
        <div className={`${fieldLabel} gap-4`}>
          <label htmlFor={id} className="flex items-center gap-1.5">
            <FieldIcon def={def} className="size-[15px] text-muted" />
            {label}
          </label>
          <label className="pointer-events-auto flex cursor-pointer items-center gap-1.5 font-normal">
            <Checkbox
              checked={values[tick.key] === "1"}
              onChange={(e) => onChange(tick.key, e.target.checked ? "1" : "")}
            />
            {tick.label}
          </label>
        </div>
      ) : (
        <label htmlFor={id} className={fieldLabel}>
          <FieldIcon def={def} className="size-[15px] text-muted" />
          {label}
        </label>
      )}
      <FieldInput
        def={def}
        id={id}
        values={values}
        presets={presets}
        near={near}
        onChange={onChange}
        invalid={invalid}
        describedBy={invalid ? describedBy : undefined}
        className={`${fieldControl(clearable)} ${textClassName}`}
      />
      {clearable && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={() => {
            for (const key of fieldKeys(def)) onChange(key, "");
            document.getElementById(id)?.focus();
          }}
          className="absolute right-2.5 bottom-[11px] z-(--layer-raised) flex size-7 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-hairline hover:text-ink focus-ring"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
