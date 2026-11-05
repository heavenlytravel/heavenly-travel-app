import Link from "next/link";
import { StatusDot, type BadgeTone } from "@repo/ui/badge";
import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";
import { SURFACE } from "./Card";

/** One figure: its name, its number, and where it leads when it is a filter. */
export type Figure = {
  key: string;
  label: string;
  value: ReactNode;
  /** A disc before the name, in a status's colour. */
  tone?: BadgeTone;
  /** The list narrowed to it; none for a figure that only counts. */
  href?: string;
  /** The list on screen is narrowed to it: a brand ring. */
  current?: boolean;
};

/**
 * Figures over a list, a white tile each with its name over its number:
 * the ones a list is narrowed by, in place of tabs, the one on screen
 * ringed in brand blue, and the ones that only sum it up. A tile with
 * `href` is a link to the list narrowed to it. Bookings', Assign's,
 * Media's and Pages' statuses, the fleet's service and documents, Rates'
 * trip rules; the Dashboard keeps its own band.
 */
export function FigureTiles({
  label,
  figures,
}: {
  /** What the tiles show, for assistive technology: "Bookings by status". */
  label: string;
  figures: readonly Figure[];
}) {
  // Links to the list narrowed are navigation; figures that only count are not.
  const Wrapper = figures.some((figure) => figure.href) ? "nav" : "section";
  return (
    <Wrapper aria-label={label} className="mb-5">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] md:gap-4">
        {figures.map((figure) => (
          <li key={figure.key} className="min-w-0">
            <FigureTile figure={figure} />
          </li>
        ))}
      </ul>
    </Wrapper>
  );
}

function FigureTile({ figure }: { figure: Figure }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-caption font-medium text-muted">
        {figure.tone ? <StatusDot tone={figure.tone} /> : null}
        <span className="truncate">{figure.label}</span>
      </span>
      <span className="mt-2 block font-serif text-figure leading-none text-ink tabular-nums">
        {figure.value}
      </span>
    </>
  );
  const classes = cx(
    "block px-4 py-3.5 md:px-5 md:py-4",
    SURFACE,
    figure.current && "border-brand ring-1 ring-brand",
  );
  return figure.href ? (
    <Link
      href={figure.href}
      aria-current={figure.current ? "page" : undefined}
      className={cx(
        classes,
        "transition-shadow hover:border-edge focus-ring",
        figure.current && "hover:border-brand",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
