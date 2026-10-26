"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HUB_PAGES,
  SITE_PAGE_LABELS,
  locationPagePath,
  sitePagePath,
} from "@repo/db";
import { Menu, MenuItem, MenuSeparator } from "@repo/ui/menu";
import { Sheet } from "@repo/ui/sheet";
import { cx } from "@repo/ui/cx";
import { AccountMenu } from "../(site)/_components/AccountMenu";
import { focus } from "../(site)/_components/Page";
import {
  ACCOUNT_BOOKINGS_PATH,
  ACCOUNT_PATH,
  signInHref,
  signUpHref,
} from "../_lib/routes";
import { Photo } from "./Brand";

/** A location the Destinations menu offers: the home page's top choices. */
export type HeaderDestination = { slug: string; name: string };

/** Where "All destinations" goes: the home page's "Choose your destination". */
const ALL_DESTINATIONS = "/#destinations";

/** A link of the bar: the services and Destinations. */
const navLink = `inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[0.95rem] font-semibold text-ink hover:text-brand aria-[current=page]:text-brand data-[state=open]:text-brand ${focus}`;

/** A quiet text button beside the pill. */
const quiet = `inline-flex min-h-[44px] items-center rounded-full px-3 whitespace-nowrap text-[0.92rem] font-semibold text-ink underline-offset-6 hover:underline ${focus}`;

/** The one filled button of the header. */
const pill = `inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-[0.92rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(4,107,210,0.18)] hover:bg-brand-strong ${focus}`;

/** A row of the phone menu. */
const sheetLink = `flex min-h-[52px] items-center border-b border-slate-100 text-[1.05rem] font-semibold text-ink aria-[current=page]:text-brand ${focus}`;

/** Whether the page has scrolled past the top, for the bar's solid look. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

/**
 * The header of every page of the customer site, held at the top as the
 * page scrolls. The logo; the services' hubs and Destinations, a menu of
 * the home page's top choices and the way to all of them; then the
 * account: signed out, "Sign in" and "Sign up", both coming back to the
 * page; signed in, "My bookings" and the account's menu. Below `lg` the
 * links fold into a panel opened by the menu button. Many of these pages
 * are static, so the header asks Clerk in the browser and shows no account
 * button until it knows; its height is fixed, so nothing moves when they
 * come. `overlay` floats it over the home page's hero, clear until the
 * page scrolls. See docs/261026-service-hubs.md, "The header".
 */
export function SiteHeader({
  destinations,
  overlay = false,
}: {
  destinations: readonly HeaderDestination[];
  overlay?: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const solid = !overlay || scrolled;
  const inDestination = destinations.some(
    ({ slug }) =>
      pathname === locationPagePath(slug) ||
      pathname.startsWith(`${locationPagePath(slug)}/`),
  );
  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined;

  return (
    <header
      className={cx(
        "inset-x-0 top-0 z-30 transition-[background-color,box-shadow,border-color] duration-200 motion-reduce:transition-none",
        overlay ? "fixed" : "sticky",
        solid
          ? "border-b border-slate-200/80 bg-white/90 shadow-[0_6px_24px_rgba(0,38,75,0.06)] backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <div className="flex h-[68px] items-center justify-between gap-4 px-5 sm:h-[76px] sm:px-[clamp(20px,5vw,76px)]">
        <div className="flex min-w-0 items-center gap-8">
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

          <nav aria-label="Site" className="hidden items-center gap-1 lg:flex">
            {HUB_PAGES.map((page) => (
              <Link
                key={page}
                href={sitePagePath(page)}
                aria-current={current(sitePagePath(page))}
                className={navLink}
              >
                {SITE_PAGE_LABELS[page]}
              </Link>
            ))}
            <Menu
              label="Destinations"
              className="min-w-60 p-1.5"
              trigger={
                <button
                  type="button"
                  aria-current={inDestination ? "page" : undefined}
                  className={navLink}
                >
                  Destinations
                  <ChevronGlyph />
                </button>
              }
            >
              {destinations.map(({ slug, name }) => (
                <MenuItem key={slug} asChild className="py-2 text-[0.95rem]">
                  <Link href={locationPagePath(slug)}>{name}</Link>
                </MenuItem>
              ))}
              {destinations.length > 0 && <MenuSeparator />}
              <MenuItem asChild className="py-2 text-[0.95rem] font-semibold">
                <Link href={ALL_DESTINATIONS}>All destinations</Link>
              </MenuItem>
            </Menu>
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {isLoaded &&
            (isSignedIn ? (
              <>
                <Link
                  href={ACCOUNT_BOOKINGS_PATH}
                  aria-current={current(ACCOUNT_BOOKINGS_PATH)}
                  className={`${quiet} aria-[current=page]:text-brand max-sm:hidden`}
                >
                  My bookings
                </Link>
                <span className="ml-1 flex">
                  <AccountMenu />
                </span>
              </>
            ) : (
              <>
                <Link
                  href={signInHref(pathname)}
                  className={`${quiet} max-sm:hidden`}
                >
                  Sign in
                </Link>
                <Link href={signUpHref(null, pathname)} className={pill}>
                  Sign up
                </Link>
              </>
            ))}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className={`-mr-2 ml-1 p-2.5 text-ink lg:hidden ${focus}`}
          >
            <span className="m-[5px] block h-0.5 w-[22px] bg-current" />
            <span className="m-[5px] block h-0.5 w-[22px] bg-current" />
          </button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen} title="Site menu">
        <div className="flex h-[68px] items-center justify-between px-5 sm:h-[76px]">
          <span className="text-[0.76rem] font-bold tracking-[0.25em] text-brand uppercase">
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
        <nav aria-label="Site" className="grid px-5 pb-6">
          {HUB_PAGES.map((page) => (
            <Link
              key={page}
              href={sitePagePath(page)}
              onClick={close}
              aria-current={current(sitePagePath(page))}
              className={sheetLink}
            >
              {SITE_PAGE_LABELS[page]}
            </Link>
          ))}
          <p className="mt-6 mb-1 text-[0.76rem] font-bold tracking-[0.2em] text-slate-500 uppercase">
            Destinations
          </p>
          {destinations.map(({ slug, name }) => (
            <Link
              key={slug}
              href={locationPagePath(slug)}
              onClick={close}
              aria-current={current(locationPagePath(slug))}
              className={sheetLink}
            >
              {name}
            </Link>
          ))}
          <Link href={ALL_DESTINATIONS} onClick={close} className={sheetLink}>
            All destinations
          </Link>
          {isLoaded && (
            <div className="mt-6 grid gap-2">
              {isSignedIn ? (
                <>
                  <Link
                    href={ACCOUNT_BOOKINGS_PATH}
                    onClick={close}
                    className={sheetLink}
                  >
                    My bookings
                  </Link>
                  <Link
                    href={ACCOUNT_PATH}
                    onClick={close}
                    className={sheetLink}
                  >
                    Account
                  </Link>
                </>
              ) : (
                <Link
                  href={signInHref(pathname)}
                  onClick={close}
                  className={sheetLink}
                >
                  Sign in
                </Link>
              )}
            </div>
          )}
        </nav>
      </Sheet>
    </header>
  );
}

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform [[data-state=open]>&]:rotate-180"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
