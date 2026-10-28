"use client";

import { cx } from "@repo/ui/cx";
import { Select } from "@repo/ui/select";
import { useRouter } from "next/navigation";

/** One choice of a filter, "All …" worth "", with the address it opens. */
export type FilterSelectOption = {
  value: string;
  label: string;
  href: string;
};

/**
 * A dropdown that narrows a list to one choice, or back to all: the
 * location of the lists across locations, and the section and status of
 * the Pages lists. A choice other than "All …" is tinted, so what narrows
 * the list shows at a glance. The page builds each choice's address with
 * `filterOptions`, keeping its own other filters, since a server page
 * cannot hand a client component a function.
 */
export function FilterSelect({
  label,
  options,
  value,
}: {
  /** What it filters by, for screen readers: "Location". */
  label: string;
  options: readonly FilterSelectOption[];
  /** The choice in force; "" for all. */
  value: string;
}) {
  const router = useRouter();
  return (
    <Select
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        const option = options.find((entry) => entry.value === next);
        if (option) router.push(option.href);
      }}
      options={options.map(({ value, label }) => ({ value, label }))}
      className={cx(
        "w-full sm:w-auto sm:min-w-40",
        value !== "" && "border-brand bg-brand-tint text-navy",
      )}
    />
  );
}
