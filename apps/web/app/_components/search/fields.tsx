"use client";

import { BOOKING_RULES, type BBox } from "@repo/db";
import { DateField, DateTimeField } from "@repo/ui/date-field";
import {
  ArrowRightIcon,
  BedIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  MapPinIcon,
  UsersIcon,
} from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";
import { PlaceInput, type PlacePresets } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import {
  isPlaceKey,
  type FieldDef,
  type FieldKey,
  type SearchValues,
} from "../../_lib/search";

const MAX_COUNT = 99;
const { timeZone } = BOOKING_RULES;

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
  hours: ClockIcon,
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
  "pointer-events-none absolute top-2.5 left-[18px] z-(--layer-raised) flex items-center gap-1.5 text-caption/5 font-semibold text-body";

/**
 * A field filling its `fieldBox`, under the label: what is filled in ink,
 * the placeholder in muted. `clearable` leaves room for the × at its end.
 */
export const fieldControl = (clearable: boolean) =>
  `h-full min-h-[70px] w-full border-0 bg-transparent pt-[34px] pb-2.5 pl-[18px] text-ink outline-none placeholder:text-muted data-placeholder:text-muted ${
    clearable ? "pr-11" : "pr-[18px]"
  }`;
