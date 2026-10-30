import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";
import { SURFACE } from "@repo/console/Card";

/**
 * A white card on the navy of `AuthShell`, centred, for a page outside the
 * console: its title in the display face, as a console page's is, then
 * its lines and its one way on. No access, a page not found, an error.
 */
export function PortalCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("w-full max-w-[26rem] p-8 text-center", SURFACE)}>
      <h1 className="font-serif text-3xl leading-display text-ink">{title}</h1>
      {children}
    </div>
  );
}
