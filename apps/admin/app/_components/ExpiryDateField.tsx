"use client";

import { expiryStateOf, expiryText } from "@repo/db";
import { DateField } from "@repo/ui/date-field";
import { Field } from "@repo/ui/field";
import { useState } from "react";

const STATE_TEXT = {
  valid: "text-slate-500",
  due: "text-amber-700",
  expired: "text-red-700",
} as const;

/**
 * The expiry date of one document, picked on a calendar and posted as
 * "2027-03-12" under `name`, or empty for none: how far off it is shows
 * under it, amber within 30 days and red once passed. "Clear" empties it.
 */
export function ExpiryDateField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  /** The document: "Road tax". */
  label: string;
  defaultValue: string | null;
}) {
  const [day, setDay] = useState(defaultValue ?? "");
  const state = day ? expiryStateOf(day) : null;

  return (
    <div className="grid content-start gap-1">
      <Field
        label={label}
        hint={
          state ? (
            <span className={STATE_TEXT[state]}>{expiryText(day)}</span>
          ) : (
            "Empty when it does not apply."
          )
        }
      >
        <DateField
          name={name}
          value={day}
          onChange={setDay}
          placeholder="No date"
          aria-label={`${label} expiry`}
        />
      </Field>
      {day ? (
        <button
          type="button"
          onClick={() => setDay("")}
          className="justify-self-start text-xs text-slate-600 underline-offset-4 hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
