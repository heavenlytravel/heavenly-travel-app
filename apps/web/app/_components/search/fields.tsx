"use client";

import {
  isPlaceKey,
  type FieldDef,
  type SearchValues,
} from "../../_lib/search";
import { PlaceInput } from "./PlaceInput";

const MAX_COUNT = 99;

/** Lowest and current number for a count field. */
export function countOf(def: FieldDef, values: SearchValues) {
  const min = def.min ?? 1;
  const n = Number(values[def.key]);
  return { min, value: Number.isFinite(n) ? Math.max(min, n) : min };
}

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

const TONES = {
  light:
    "border-[#c9d6d3] bg-white text-[#0c3b3a] hover:border-[#157a74] focus-visible:outline-[#157a74]",
  dark: "border-white/25 bg-white/5 text-white hover:border-white/60 focus-visible:outline-[#e4a93c]",
};

/** Minus, number, plus. Easier than typing a number on a phone. */
export function Stepper({
  def,
  values,
  onChange,
  tone = "light",
  size = "h-9 w-9",
}: {
  def: FieldDef;
  values: SearchValues;
  onChange: (value: string) => void;
  tone?: keyof typeof TONES;
  size?: string;
}) {
  const { min, value } = countOf(def, values);
  const button = `grid ${size} shrink-0 place-items-center rounded-full border text-lg leading-none font-semibold disabled:opacity-35 focus-visible:outline-3 focus-visible:outline-offset-2 ${TONES[tone]}`;
  return (
    <div
      role="group"
      aria-label={def.label}
      className="inline-flex items-center gap-2.5"
    >
      <button
        type="button"
        aria-label={`Fewer: ${def.label}`}
        disabled={value <= min}
        onClick={() => onChange(String(value - 1))}
        className={button}
      >
        &minus;
      </button>
      <output
        aria-live="polite"
        className="min-w-7 text-center font-(family-name:--font-display) text-lg font-bold tabular-nums"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`More: ${def.label}`}
        disabled={value >= MAX_COUNT}
        onClick={() => onChange(String(value + 1))}
        className={button}
      >
        +
      </button>
    </div>
  );
}
