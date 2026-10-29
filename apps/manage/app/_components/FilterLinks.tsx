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
      className={`inline-flex h-8 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
        active
          ? "border-ink bg-ink text-white"
          : "border-edge bg-white text-body hover:border-slate-300 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
