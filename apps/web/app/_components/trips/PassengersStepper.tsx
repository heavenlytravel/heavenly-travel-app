"use client";

import { useId } from "react";
import { UsersIcon } from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";
import { fieldRing } from "../search/fields";

/** The most a stepper counts to: a group past every vehicle is sent elsewhere by the page. */
export const MAX_PASSENGERS = 99;

/** What a typed group size counts as: none to the most, an emptied field none. */
export function clampPassengers(typed: string) {
  return Math.min(MAX_PASSENGERS, Math.max(0, Number(typed) || 0));
}

/** What a search says while the group's size is still none. */
export const NO_PASSENGERS = "Enter how many passengers are travelling.";

/**
 * The group's size, asked once for the booking: the one vehicle must seat
 * them all, so it is the most travelling on any trip. One line the height
 * of the buttons beside it, the label on the left and a minus and a plus
 * either side of the number on the right. It starts at none, so the
 * customer gives the real number; `invalid` draws it in red when a search
 * was sent without one, tied to the line that says so (`describedBy`).
 */
export function PassengersStepper({
  value,
  onChange,
  invalid = false,
  describedBy,
  className = "",
}: {
  value: number;
  onChange: (passengers: number) => void;
  invalid?: boolean;
  describedBy?: string;
  /** The box's width where it sits. */
  className?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex min-h-14 items-center gap-3 rounded-control border bg-white py-1.5 pr-2.5 pl-4 text-copy font-semibold text-body focus-within:border-brand ${
        invalid ? "border-danger" : "border-card-edge"
      } ${fieldRing} ${className}`}
    >
      <UsersIcon className="size-[18px] shrink-0 text-muted" />
      Passengers
      <NumberField
        id={id}
        bare
        min={0}
        max={MAX_PASSENGERS}
        value={value}
        onChange={(e) => onChange(clampPassengers(e.target.value))}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="ml-auto w-[120px] text-base text-ink"
      />
    </label>
  );
}
