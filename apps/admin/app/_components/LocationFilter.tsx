"use client";

import { Select } from "@repo/ui/select";
import { useRouter } from "next/navigation";
import { useId } from "react";

/** One choice of the filter: a location, or "All locations", with the address it opens. */
export type LocationFilterOption = {
  value: string;
  label: string;
  href: string;
};

/**
 * Narrows a list across locations to one location, or back to all: the
 * Bookings queue, Coverage and Rates. The page builds each choice's
 * address, keeping its own other filters, since a server page cannot hand
 * a client component a function.
 */
export function LocationFilter({
  options,
  value,
}: {
  options: readonly LocationFilterOption[];
  /** The location in force; "" for every location. */
  value: string;
}) {
  const id = useId();
  const router = useRouter();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">Location</span>
      <Select
        id={id}
        value={value}
        onValueChange={(next) => {
          const option = options.find((entry) => entry.value === next);
          if (option) router.push(option.href);
        }}
        options={options.map(({ value, label }) => ({ value, label }))}
        className="w-auto min-w-40"
      />
    </label>
  );
}
