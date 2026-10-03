import { type ReactNode } from "react";

export function PageHeader({
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
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
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
