import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";

/**
 * What a card or a list shows when it has nothing yet: a quiet line, or a
 * few, centred. `slot` draws the dashed edge of a place something can be
 * added. In a table, use `EmptyRow`, which has the same look.
 */
export function EmptyState({
  slot = false,
  className,
  children,
}: {
  slot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "px-5 py-10 text-center text-sm text-muted",
        slot && "rounded-card border border-dashed border-slot",
        className,
      )}
    >
      {children}
    </div>
  );
}
