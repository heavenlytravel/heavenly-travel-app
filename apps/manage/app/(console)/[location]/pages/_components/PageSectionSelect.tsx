"use client";

import { cx } from "@repo/ui/cx";
import { Select } from "@repo/ui/select";
import { useRouter } from "next/navigation";

/** One choice of the section, "All sections" worth "", with the list's address narrowed to it. */
export type SectionOption = { value: string; label: string; href: string };

/**
 * The dropdown over a list of pages that narrows it to one section, or
 * back to every section. A section chosen is tinted, so what narrows the
 * list shows at a glance. The page builds each choice's address, keeping
 * its other filters, since a server page cannot hand a client component a
 * function.
 */
export function PageSectionSelect({
  options,
  value,
}: {
  options: readonly SectionOption[];
  /** The section in force; "" for every section. */
  value: string;
}) {
  const router = useRouter();
  return (
    <Select
      aria-label="Section"
      value={value}
      onValueChange={(next) => {
        const option = options.find((entry) => entry.value === next);
        if (option) router.push(option.href);
      }}
      options={options.map(({ value, label }) => ({ value, label }))}
      className={cx(
        "w-full sm:w-auto sm:min-w-44",
        value !== "" && "border-brand bg-brand-tint text-navy",
      )}
    />
  );
}
