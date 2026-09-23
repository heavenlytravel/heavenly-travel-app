"use client";

import {
  isPlaceKey,
  type FieldDef,
  type SearchValues,
} from "../../_lib/search";
import { PlaceInput } from "./PlaceInput";

const MAX_COUNT = 99;

/**
 * The right input for a field. Each search box styles it its own way, but
 * what a date, a time or a place needs stays the same. A place field is an
 * autocomplete: `onChange` gets the place id when a suggestion is picked and
 * nothing when the text was typed.
 */
export function FieldInput({
  def,
  id,
  values,
  onChange,
  onFocus,
  className,
}: {
  def: FieldDef;
  id: string;
  values: SearchValues;
  onChange: (value: string, placeId?: string) => void;
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
        onChange={onChange}
        onFocus={onFocus}
        className={className}
      />
    );
  }
  const shared = {
    id,
    className,
    onFocus,
    value: values[def.key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(e.target.value),
  };
  if (def.kind === "date")
    return (
      <input
        {...shared}
        type="date"
        // A return or a check-out cannot come before the start date.
        min={def.key === "endDate" ? values.date : undefined}
      />
    );
  if (def.kind === "time") return <input {...shared} type="time" />;
  if (def.kind === "count")
    return (
      <input
        {...shared}
        type="number"
        inputMode="numeric"
        min={def.min ?? 1}
        max={MAX_COUNT}
      />
    );
  return <input {...shared} placeholder={def.placeholder} autoComplete="off" />;
}
