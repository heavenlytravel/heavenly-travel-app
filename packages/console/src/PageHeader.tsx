import Link from "next/link";
import { ArrowLeftIcon } from "@repo/ui/icons";
import { type ReactNode } from "react";

export type HeaderProps = {
  title: ReactNode;
  /**
   * The section a page of it is in, small and upper case over the title:
   * "Fleet" over "Vehicles". Only on a page inside a section with pages.
   */
  section?: string;
  /** What stands beside the title: the record's status. */
  badge?: ReactNode;
  /** A line of facts under the title: who booked it, when and where. Never an explanation of the page. */
  meta?: ReactNode;
  /** What stands at the right, level with the title: the buttons, a status. */
  action?: ReactNode;
};

/**
 * The heading of a console page: its title in the display face, the
 * section over it when it has one, the record's status beside it, its
 * buttons at the right, and a line of facts under it. On a narrow screen
 * the buttons wrap under the title. No sentence says what the page is:
 * help stays in the info tips.
 */
export function PageHeader({
  title,
  section,
  badge,
  meta,
  action,
}: HeaderProps) {
  return (
    <header className="mb-6">
      {section ? (
        <p className="mb-1.5 text-[13px] font-semibold tracking-[0.08em] text-brand uppercase">
          {section}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-1.5">
            <h1 className="font-serif text-[1.875rem] leading-[1.1] text-ink md:text-[2.125rem]">
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

/** The way back above a record's title, to the list it was opened from: "← Bookings". */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-3.5 inline-flex items-center gap-1.5 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
    >
      <ArrowLeftIcon className="size-4" />
      {children}
    </Link>
  );
}
