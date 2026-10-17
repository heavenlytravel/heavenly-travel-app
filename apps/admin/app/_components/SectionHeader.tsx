import { type ReactNode } from "react";

/**
 * The heading of a part of a page that already has its `PageHeader`: a tab
 * of a location, or an editor under it. The same shape, one level down.
 */
export function SectionHeader({
  title,
  badge,
  description,
  action,
}: {
  title: string;
  /** What stands beside the title: the record's status. */
  badge?: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {badge}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
