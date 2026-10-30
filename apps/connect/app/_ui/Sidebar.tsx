"use client";

import { AccountMenu } from "@repo/auth/AccountMenu";
import { CONTACT } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_PATH, isActive, navItems } from "./nav";

/**
 * Connect on a large screen: the ink column at the left with the logo,
 * the places (Jobs, and for a vendor's member Fleet and Team), the way to
 * WhatsApp Operation and the account. A phone has the tab bar instead.
 */
export function Sidebar({ member }: { member?: { owner: boolean } }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 bg-ink px-4 py-6 text-white lg:flex">
      <Link
        href="/"
        className="flex items-center gap-2.5 px-2"
        aria-label="Heavenly Travel Connect, home"
      >
        <Image
          src="/brand/logo-blue.svg"
          alt=""
          width={120}
          height={28}
          priority
          // The logo is navy; drawn white on the ink column.
          className="h-7 w-auto brightness-0 invert"
        />
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.18em] text-azure-light uppercase ring-1 ring-white/10">
          Connect
        </span>
      </Link>
      <nav aria-label="Connect" className="mt-10">
        <ul className="grid gap-1">
          {navItems(member).map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute top-2.5 bottom-2.5 -left-4 w-1 rounded-r-full bg-azure-light"
                    />
                  ) : null}
                  <Icon aria-hidden className="size-5" />
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
          className="grid gap-1 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition-colors hover:bg-white/10"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle aria-hidden className="size-4 text-azure-light" />
            Operation
          </span>
          <span className="text-xs text-white/60">
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
