"use client";

import { useId } from "react";
import { UsersIcon } from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";

/** The most a stepper counts to: a group past every vehicle is sent elsewhere by the page. */
const MAX_PASSENGERS = 99;

/**
 * The group's size, asked once for the booking: the one vehicle must seat
 * them all, so it is the most travelling on any trip. A minus and a plus
 * beside the number; an emptied field counts as one.
 */
export function PassengersStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (passengers: number) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white py-1.5 pr-1.5 pl-4 text-[0.92rem] font-semibold text-slate-800"
    >
      <UsersIcon className="size-[18px] shrink-0 text-slate-500" />
      Passengers
      <NumberField
        id={id}
        bare
        min={1}
        max={MAX_PASSENGERS}
        value={value}
        onChange={(e) =>
          onChange(
            Math.min(MAX_PASSENGERS, Math.max(1, Number(e.target.value) || 1)),
          )
        }
        className="w-[120px] text-[1rem] text-ink"
      />
    </label>
  );
}
