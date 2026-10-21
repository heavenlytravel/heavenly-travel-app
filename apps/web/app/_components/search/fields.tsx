"use client";

import { BOOKING_RULES, type BBox } from "@repo/db";
import { DateField, DateTimeField } from "@repo/ui/date-field";
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
 * place id and the autocomplete session when a suggestion is picked, and
 * nothing when the text was typed. `presets` are the places a place field
 * offers before anything is typed, `within` the box it suggests places in.
 * Days and times are read in Malaysia, where the trip happens.
 */
export function FieldInput({
  def,
  id,
  values,
  presets,
  within,
  onChange,
  onFocus,
  className,
}: {
  def: FieldDef;
  id: string;
  values: SearchValues;
  presets?: PlacePresets;
  within?: BBox;
  onChange: (
    key: FieldKey,
    value: string,
    placeId?: string,
    sessionToken?: string,
  ) => void;
  onFocus?: () => void;
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
        within={within}
        onChange={(value, placeId, sessionToken) =>
          onChange(def.key, value, placeId, sessionToken)
        }
        onFocus={onFocus}
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
      className={className}
    />
  );
}
