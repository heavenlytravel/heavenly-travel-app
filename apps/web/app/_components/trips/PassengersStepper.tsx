"use client";

import { useId } from "react";
import { UsersIcon } from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";
import { fieldRing } from "../search/fields";

/** The most a stepper counts to: a group past every vehicle is sent elsewhere by the page. */
const MAX_PASSENGERS = 99;

/**
 * The group's size, asked once for the booking: the one vehicle must seat
 * them all, so it is the most travelling on any trip. One line the height
 * of the buttons beside it, the label on the left and a minus and a plus
 * either side of the number on the right; an emptied field counts as one.
 */
export function PassengersStepper({
  value,
  onChange,
  className = "",
}: {
  value: number;
  onChange: (passengers: number) => void;
  /** The box's width where it sits. */
  className?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex min-h-14 items-center gap-3 rounded-control border border-card-edge bg-white py-1.5 pr-2.5 pl-4 text-copy font-semibold text-slate-800 focus-within:border-brand ${fieldRing} ${className}`}
    >
      <UsersIcon className="size-[18px] shrink-0 text-muted" />
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
        className="ml-auto w-[120px] text-base text-ink"
      />
    </label>
  );
}
