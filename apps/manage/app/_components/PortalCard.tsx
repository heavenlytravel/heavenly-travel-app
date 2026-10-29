import { cx } from "@repo/ui/cx";
import Image from "next/image";
import type { ReactNode } from "react";
import { SURFACE } from "@repo/console/Card";

/**
 * The logo over the pages outside the console, on the navy of `AuthShell`:
 * the sign-in, a page not found. The file is navy; it is drawn white.
 */
export function ConsoleLogo() {
  return (
    <Image
      src="/brand/logo-blue.svg"
      alt="Heavenly, your travel engineer"
      width={120}
      height={28}
      priority
      className="h-9 w-auto brightness-0 invert"
    />
  );
}

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
