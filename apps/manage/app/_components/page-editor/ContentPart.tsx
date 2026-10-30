import { Badge } from "@repo/ui/badge";
import type { ReactNode } from "react";

/**
 * One part of a published or draft content view (a page's, the footer's):
 * its name, "Changed" when the draft differs, and its value.
 */
export function ContentPart({
  label,
  changed,
  children,
}: {
  label: string;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs font-semibold text-muted">
        {label}
        {changed ? <Badge tone="amber">Changed</Badge> : null}
      </dt>
      <dd className="mt-1 grid gap-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

/** What a content view shows for a part left empty. */
export const NONE = <span className="text-muted">None</span>;
