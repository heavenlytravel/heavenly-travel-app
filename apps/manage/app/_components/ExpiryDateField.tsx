"use client";

import { expiryStateOf, expiryText, type ExpiryState } from "@repo/db";
import { Badge, type BadgeTone } from "@repo/ui/badge";
import { DateField } from "@repo/ui/date-field";
import { Field } from "@repo/ui/field";
import { useState } from "react";

const CHIP_TONES: Record<ExpiryState, BadgeTone> = {
  valid: "green",
  due: "amber",
  expired: "red",
};

/**
 * The expiry date of one document, picked on a calendar and posted as
 * "2027-03-12" under `name`, or empty for none. A chip beside its name
 * says where it stands as the date is picked: in date (green), how soon
 * it expires within 30 days (amber), or how long ago it expired (red).
 * "Clear" empties it.
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
        label={
          <span className="flex min-h-6 items-center justify-between gap-2">
            {label}
            {state ? (
              <span title={expiryText(day)}>
                <Badge dot tone={CHIP_TONES[state]}>
                  {state === "valid" ? "In date" : expiryText(day)}
                </Badge>
              </span>
            ) : null}
          </span>
        }
        hint={day ? undefined : "Empty when it does not apply."}
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
          className="justify-self-start text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
