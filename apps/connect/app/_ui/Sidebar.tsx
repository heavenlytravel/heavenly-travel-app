"use client";

import { AccountMenu } from "@repo/auth/AccountMenu";
import { CONTACT } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { MessageCircleIcon } from "@repo/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_PATH, isActive, navItems } from "./nav";
import { ConnectMark } from "./parts";

/**
 * Connect on a large screen: manage's navy column at the left, navy to
 * ink, with the logo, the places (Jobs, and for a vendor's member Fleet
 * and Team) in its menu's rows, the way to WhatsApp Operation and the
 * account. A phone has the tab bar instead.
 */
export function Sidebar({ member }: { member?: { owner: boolean } }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col bg-linear-to-b from-navy to-ink px-4 py-6 text-white/80 lg:flex">
      <Link
        href="/"
        className="flex items-center gap-2.5 self-start rounded-md px-2 focus-ring focus-ring-dark"
        aria-label="Heavenly Travel Connect, home"
      >
        <ConnectMark />
      </Link>
      <nav aria-label="Connect" className="mt-10">
        <ul className="grid gap-0.5">
          {navItems(member).map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex h-10 items-center gap-2.5 rounded-control px-3 text-sm transition-colors focus-ring-inset focus-ring-dark",
                    active
                      ? "bg-white font-semibold text-ink [&>svg]:text-brand"
                      : "font-medium text-white/80 hover:bg-white/14 hover:text-white [&>svg]:text-azure-light",
                  )}
                >
                  <Icon aria-hidden className="size-4.5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto grid gap-4">
        <a
          href={CONTACT.whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="grid gap-1 rounded-card border border-white/15 bg-white/6 p-4 transition-colors hover:bg-white/12 focus-ring focus-ring-dark"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageCircleIcon className="text-azure-light" />
            Operation
          </span>
          <span className="text-xs text-white/75">
            WhatsApp {CONTACT.whatsappNumber}
          </span>
        </a>
        <div className="border-t border-white/10 pt-4">
          <AccountMenu accountHref={ACCOUNT_PATH} showName align="start" />
        </div>
      </div>
    </aside>
  );
}
