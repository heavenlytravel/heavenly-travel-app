import { type ReactNode } from "react";

/**
 * The heading of a part of a page that stands outside a card: a group of
 * cards under one name. Its title in the body face, bold, with its
 * buttons at the right.
 */
export function SectionHeader({
  title,
  badge,
  meta,
  action,
}: {
  title: ReactNode;
  badge?: ReactNode;
  /** A short note beside the title. */
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold tracking-title text-ink">{title}</h2>
        {badge}
        {meta ? <span className="text-caption text-muted">{meta}</span> : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      ) : null}
    </header>
  );
}
