import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A row of links that narrow a list, "All" first and the one in force
 * marked. `hrefOf` names the list with the value in its address, so the
 * filter survives a reload and a shared link. The bookings lists filter by
 * status with it, a location's history by the part of the location.
 */
export function FilterLinks<Value extends string>({
  label,
  options,
  active,
  hrefOf,
}: {
  /** What the row filters by, for screen readers: "Filter by status". */
  label: string;
  options: readonly { value: Value; label: string }[];
  active: Value | undefined;
  hrefOf: (value: Value | undefined) => string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      <FilterLink href={hrefOf(undefined)} active={active === undefined}>
        All
      </FilterLink>
      {options.map((option) => (
        <FilterLink
          key={option.value}
          href={hrefOf(option.value)}
          active={active === option.value}
        >
          {option.label}
        </FilterLink>
      ))}
    </nav>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      }`}
    >
      {children}
    </Link>
  );
}
