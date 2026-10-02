"use client";

import { InfoTip } from "@repo/ui/info-tip";
import { useState } from "react";

/** A district as the picker offers it. */
export type DistrictOption = {
  code: string;
  name: string;
  stateCode: string;
  stateName: string;
  /** Whether pickups there are served, shown beside the name. */
  isActive: boolean;
};

const checkboxClassName = "size-4 accent-neutral-900";

/**
 * Where a location lies: Marketing ticks its states first, then the
 * districts of those states. Penang is Barat Daya and Timur Laut. The form
 * receives each ticked district as `districts`. Unticking a state unticks
 * its districts.
 */
export function DistrictPicker({
  districts,
  value,
  onChange,
}: {
  /** Every district, by state then name. */
  districts: DistrictOption[];
  /** The codes of the ticked districts. */
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  const states = [
    ...new Map(districts.map((d) => [d.stateCode, d.stateName])),
  ].map(([code, name]) => ({ code, name }));
  const [openStates, setOpenStates] = useState(
    () =>
      new Set(
        districts.filter((d) => value.includes(d.code)).map((d) => d.stateCode),
      ),
  );

  function toggleState(code: string, on: boolean) {
    const next = new Set(openStates);
    if (on) {
      next.add(code);
    } else {
      next.delete(code);
      const inState = new Set(
        districts.filter((d) => d.stateCode === code).map((d) => d.code),
      );
      onChange(value.filter((ticked) => !inState.has(ticked)));
    }
    setOpenStates(next);
  }

  return (
    <div className="grid gap-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-neutral-800">
          <span className="inline-flex items-center gap-1.5">
            States
            <InfoTip text="Tick each state the location lies in, then its districts below. This is information for the team: it does not change what the public sees or where a pickup is served." />
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {states.map((state) => (
            <label key={state.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={openStates.has(state.code)}
                onChange={(event) =>
                  toggleState(state.code, event.target.checked)
                }
                className={checkboxClassName}
              />
              {state.name}
            </label>
          ))}
        </div>
      </fieldset>

      {states
        .filter((state) => openStates.has(state.code))
        .map((state) => (
          <fieldset key={state.code}>
            <legend className="mb-1.5 text-sm font-medium text-neutral-800">
              Districts in {state.name}
            </legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {districts
                .filter((d) => d.stateCode === state.code)
                .map((district) => (
                  <label
                    key={district.code}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="districts"
                      value={district.code}
                      checked={value.includes(district.code)}
                      onChange={(event) =>
                        onChange(
                          event.target.checked
                            ? [...value, district.code]
                            : value.filter((code) => code !== district.code),
                        )
                      }
                      className={checkboxClassName}
                    />
                    <span>
                      {district.name}
                      {district.isActive ? null : (
                        <span className="text-xs text-neutral-500">
                          {" "}
                          · pickups off
                        </span>
                      )}
                    </span>
                  </label>
                ))}
            </div>
          </fieldset>
        ))}

      {openStates.size === 0 ? (
        <p className="text-xs text-neutral-500">
          Tick a state to see its districts. A location needs at least one
          district.
        </p>
      ) : null}
    </div>
  );
}
