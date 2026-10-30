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
 * Figures a list is narrowed by, in place of tabs: a white tile each with
 * its name over its number, the one on screen ringed in brand blue. A
 * tile with `href` is a link to the list narrowed to it. Bookings' and
 * Media's statuses.
 */
export function FigureTiles({
  label,
  figures,
}: {
  /** What the tiles narrow, for assistive technology: "Bookings by status". */
  label: string;
  figures: readonly Figure[];
}) {
  return (
    <nav aria-label={label} className="mb-5">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] md:gap-4">
        {figures.map((figure) => (
          <li key={figure.key} className="min-w-0">
            <FigureTile figure={figure} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FigureTile({ figure }: { figure: Figure }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-caption font-medium text-muted">
        {figure.tone ? <StatusDot tone={figure.tone} /> : null}
        <span className="truncate">{figure.label}</span>
        {figure.current ? (
          <span className="ml-auto text-caps font-bold text-brand max-sm:hidden">
            Showing
          </span>
        ) : null}
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

/**
 * Figures that sum up a list, in one card split by hairlines: its number
 * over its name. A cell with `href` is a link to the list narrowed to it;
 * the one on screen is tinted. Vehicles' service and documents, Pages'
 * statuses, Rates' trip rules.
 */
export function FigureStrip({
  label,
  figures,
}: {
  label: string;
  figures: readonly Figure[];
}) {
  return (
    <section aria-label={label} className={cx("mb-5 overflow-hidden", SURFACE)}>
      <ul className="grid grid-cols-2 divide-hairline max-md:[&>li:nth-child(n+3)]:border-t max-md:[&>li:nth-child(n+3)]:border-hairline max-md:[&>li:nth-child(even)]:border-l md:auto-cols-fr md:grid-flow-col md:divide-x">
        {figures.map((figure) => {
          const body = (
            <>
              <span className="block font-serif text-figure leading-none text-ink tabular-nums">
                {figure.value}
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 text-caption text-muted">
                {figure.tone ? <StatusDot tone={figure.tone} /> : null}
                {figure.label}
              </span>
            </>
          );
          const classes = cx(
            "block h-full px-5 py-4",
            figure.current && "bg-brand-tint",
          );
          return (
            <li key={figure.key} className="min-w-0 border-hairline">
              {figure.href ? (
                <Link
                  href={figure.href}
                  aria-current={figure.current ? "page" : undefined}
                  className={cx(
                    classes,
                    "transition-colors hover:bg-hover focus-ring-inset",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={classes}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
