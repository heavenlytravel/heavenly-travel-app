"use client";

import { Checkbox } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";

/** A state as the picker offers it. */
export type StateOption = { code: string; name: string };

/**
 * Where a location lies: Marketing ticks the states, Penang for Penang,
 * Kuala Lumpur and Selangor for the Klang Valley. The form receives each
 * ticked state as `states`. What the location serves within them is its
 * zones, drawn on the Coverage tab.
 */
export function StatePicker({
  states,
  value,
  onChange,
}: {
  /** Every state, by name. */
  states: readonly StateOption[];
  /** The codes of the ticked states. */
  value: readonly string[];
  onChange: (codes: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-800">
        <span className="inline-flex items-center gap-1.5">
          State
          <InfoTip text="Tick each state the location lies in. Its saved addresses have to be in one of them, and its zones are drawn within them. Which places it serves is the Coverage tab's." />
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {states.map((state) => (
          <label key={state.code} className="flex items-center gap-2 text-sm">
            <Checkbox
              name="states"
              value={state.code}
              checked={value.includes(state.code)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, state.code]
                    : value.filter((code) => code !== state.code),
                )
              }
            />
            {state.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
