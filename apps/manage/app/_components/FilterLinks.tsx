import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A row of chips that narrow a list, "All" first and the one in force
 * filled in navy. `hrefOf` names the list with the value in its address, so the
 * filter survives a reload and a shared link. Activity filters by the type
 * of record with it, a location's by the part of the location.
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
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
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
      // A chip is 32px tall; on a touch screen its hit area reaches 44px round it.
      className={`inline-flex h-8 touch-target items-center rounded-full border px-3.5 text-caption font-semibold transition-colors focus-ring ${
        active
          ? "border-ink bg-ink text-white"
          : "border-edge bg-white text-body hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
