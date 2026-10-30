"use client";

import { cx } from "@repo/ui/cx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./nav";

/**
 * A vendor member's tabs, floating at the foot of a phone's screen as
 * manage's dock does: Jobs, Fleet and, for the owner, Team. The one open
 * shows its name, in navy. `ui-dock` lifts the toasts above it. A large
 * screen has the sidebar instead.
 */
export function TabBar({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Connect"
      className="ui-dock pointer-events-none fixed inset-x-0 bottom-0 z-(--layer-chrome) flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.9rem)] lg:hidden"
    >
      <ul className="pointer-events-auto flex items-center gap-1 rounded-full border border-edge bg-white/95 p-1 shadow-overlay backdrop-blur">
        {navItems({ owner }).map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors focus-ring-inset",
                  active
                    ? "bg-navy font-semibold text-white"
                    : "font-medium text-body hover:bg-hairline",
                )}
              >
                <Icon aria-hidden className="size-4.5" />
                <span className={cx(!active && "sr-only sm:not-sr-only")}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
