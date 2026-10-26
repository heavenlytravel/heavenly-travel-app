"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { focus } from "../(site)/_components/Page";
import { ACCOUNT_PATH, signInHref, signUpHref } from "../_lib/routes";
import { Photo } from "./Brand";

/** A quiet text button beside the pill. */
const quiet = `inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-3 text-[0.92rem] font-semibold underline-offset-6 hover:underline disabled:cursor-wait disabled:opacity-60 ${focus}`;

/** The one filled button of the header. */
const pill = `inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-[0.92rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(4,107,210,0.18)] hover:bg-brand-strong ${focus}`;

/**
 * The header of the home page, the location pages and the site's own
 * pages: the logo, and the account's buttons. Signed out, "Sign in" and
 * "Sign up", both coming back to the page; signed in, "Sign out", which
 * stays on the page, and "Dashboard", the customer's account. The quiet
 * one comes first and the filled one last, in both. These pages
 * are static, so the header asks Clerk in the browser and shows no button
 * until it knows; its height is fixed, so nothing moves when they come.
 * `overlay` floats it over the home page's hero.
 */
export function MarketingHeader({ overlay = false }: { overlay?: boolean }) {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);

  return (
    <header
      className={`flex h-[66px] items-center justify-between gap-4 px-5 text-ink sm:h-[76px] sm:px-[clamp(20px,5vw,76px)] ${
        overlay ? "absolute inset-x-0 top-0 z-10" : ""
      }`}
    >
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

      {isLoaded ? (
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          {isSignedIn ? (
            <>
              <button
                type="button"
                disabled={leaving}
                onClick={() => {
                  setLeaving(true);
                  void signOut({ redirectUrl: pathname });
                }}
                className={quiet}
              >
                Sign out
              </button>
              <Link href={ACCOUNT_PATH} className={pill}>
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href={signInHref(pathname)} className={quiet}>
                Sign in
              </Link>
              <Link href={signUpHref(null, pathname)} className={pill}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      ) : null}
    </header>
  );
}
