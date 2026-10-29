"use client";

import { cx } from "@repo/ui/cx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./nav";

/**
 * A vendor member's tabs, floating at the foot of a phone's screen as a
 * phone app has them: Jobs, Fleet and, for the owner, Team. The one open
 * shows its name. `ui-dock` lifts the toasts above it. A large screen has
 * the sidebar instead.
 */
export function TabBar({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Connect"
      className="ui-dock pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.9rem)] lg:hidden"
    >
      <ul className="pointer-events-auto flex items-center gap-1 rounded-full bg-ink/95 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,38,75,0.6)] ring-1 ring-white/10 backdrop-blur-md">
        {navItems({ owner }).map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white text-ink"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon aria-hidden className="size-[1.15rem]" />
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
