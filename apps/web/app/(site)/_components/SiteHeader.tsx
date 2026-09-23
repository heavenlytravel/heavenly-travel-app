"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet } from "@repo/ui/sheet";
import { Photo } from "../../_components/Brand";
import {
  ACCOUNT_BOOKINGS_PATH,
  ACCOUNT_PATH,
  signInHref,
} from "../../_lib/routes";
import { AccountMenu } from "./AccountMenu";
import { focus, primaryButton } from "./Page";

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: ACCOUNT_BOOKINGS_PATH, label: "My bookings", exact: false },
  { href: ACCOUNT_PATH, label: "Account", exact: true },
] as const;

/**
 * The header on every page after the home page. The logo, the site links
 * and the account button from `lg` up; below that the links fold into a
 * sheet opened by the menu button, with the account button staying put.
 * Signed out, the links give way to a sign-in button that comes back here.
 */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  const isCurrent = (link: (typeof LINKS)[number]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  return (
    <header className="flex h-[66px] items-center justify-between gap-4 px-5 sm:h-[76px] sm:px-[clamp(20px,5vw,76px)]">
      <Link
        href="/"
        aria-label="Heavenly Travel home"
        className={`shrink-0 ${focus}`}
      >
        <Photo
          src="/brand/logo-blue.svg"
          alt="Heavenly, your travel engineer"
          className="h-8 w-auto sm:h-10"
          loading="eager"
        />
      </Link>

      <div className="flex items-center gap-3 sm:gap-6">
        {signedIn ? (
          <>
            <nav
              aria-label="Site"
              className="hidden items-center gap-7 lg:flex"
            >
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent(link) ? "page" : undefined}
                  className={`text-[0.92rem] font-semibold underline-offset-6 hover:underline aria-[current]:underline ${focus}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <AccountMenu />
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className={`-mr-2.5 p-2.5 lg:hidden ${focus}`}
            >
              <span className="m-[5px] block h-0.5 w-[23px] bg-current" />
              <span className="m-[5px] block h-0.5 w-[23px] bg-current" />
            </button>
            <Sheet open={open} onOpenChange={setOpen} title="Site menu">
              <div className="flex h-[66px] items-center justify-between px-5 sm:h-[76px]">
                <span className="text-[0.76rem] font-bold tracking-[0.25em] text-[#073c36] uppercase">
                  Menu
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={close}
                  className={`-mr-2.5 p-2.5 text-[1.4rem] leading-none ${focus}`}
                >
                  ×
                </button>
              </div>
              <nav aria-label="Site" className="grid px-5 py-2">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    aria-current={isCurrent(link) ? "page" : undefined}
                    className={`border-b border-[#edf0ef] py-4 text-[1.05rem] font-semibold aria-[current]:text-[#073c36] ${focus}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </Sheet>
          </>
        ) : (
          <Link
            href={signInHref(pathname)}
            className={`${primaryButton} min-h-[44px] px-5 text-[0.92rem]`}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
