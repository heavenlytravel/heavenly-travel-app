import Link from "next/link";
import { ChevronRightIcon } from "@repo/ui/icons";
import { Fragment, type ReactNode } from "react";

export type HeaderProps = {
  title: ReactNode;
  /** What stands beside the title: the record's status. */
  badge?: ReactNode;
  /** A line of facts under the title: who booked it, when and where. Never an explanation of the page. */
  meta?: ReactNode;
  /** What stands at the right, level with the title: the buttons, a status. */
  action?: ReactNode;
};

/**
 * The heading of a console page: its title in the display face, the
 * record's status beside it, its buttons at the right, and a line of facts
 * under it. On a narrow screen the buttons wrap under the title. No
 * sentence says what the page is: help stays in the info tips. Where the
 * page is, and the way back, is the `Trail` over it, which the console's
 * chrome draws.
 */
export function PageHeader({ title, badge, meta, action }: HeaderProps) {
  return (
    <header className="mb-6">
      {/* Aligned at the top, so a button taller than the title does not move it. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-1.5">
            <h1 className="font-serif text-3xl leading-display text-ink md:text-title">
              {title}
            </h1>
            {badge}
          </div>
          {meta ? <p className="mt-1.5 text-sm text-muted">{meta}</p> : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * The record a page belongs to, named in its header's line of facts as a
 * link back to it: "HT-4D9DJZ" under "Amend Trip 1", "KV589E" under a
 * vehicle's history. The trail over the title goes no deeper than the
 * record's list.
 */
export function RecordLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
    </Link>
  );
}

/**
 * The line over a page's title, small and upper case: where the page sits,
 * "Fleet › Vehicles". A step with no page of its own is grey, the page the
 * admin is on is in ink, and a page to go back to, from a record or a
 * form under it, is a link. One line, the same height on every page, so a
 * title stands in the same place on each.
 */
export function Trail({
  crumbs,
}: {
  crumbs: readonly { label: string; href?: string; current?: boolean }[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-1.5 flex h-5 min-w-0 items-center gap-1 text-caption font-semibold tracking-kicker text-muted uppercase"
    >
      {crumbs.map((crumb, at) => (
        <Fragment key={`${at}:${crumb.label}`}>
          {at > 0 ? (
            <ChevronRightIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-edge-strong"
            />
          ) : null}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="truncate rounded-sm text-brand underline-offset-4 hover:underline focus-ring"
            >
              {crumb.label}
            </Link>
          ) : crumb.current ? (
            <span aria-current="page" className="truncate text-ink">
              {crumb.label}
            </span>
          ) : (
            <span className="truncate">{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
