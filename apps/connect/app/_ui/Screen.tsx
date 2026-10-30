import { AccountMenu } from "@repo/auth/AccountMenu";
import { cx } from "@repo/ui/cx";
import { ChevronLeftIcon } from "@repo/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { ACCOUNT_PATH, HOME_PATH } from "./nav";
import { Logo } from "@repo/ui/logo";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";

/** How wide a screen's content runs on a large screen. */
const WIDTHS = {
  /** Lists and two columns: the home, a job, Fleet. */
  wide: "lg:max-w-6xl",
  /** One form or one message. */
  narrow: "lg:max-w-4xl",
} as const;

/**
 * Every Connect screen: the band at the top (manage's Signature band, navy
 * to ink, its heading in the serif), with the logo or the way
 * back, the account, and the screen's own heading; then the screen's
 * panels, the first rising over the band's edge.
 *
 * On a phone it is one column, and a vendor's member has the tabs
 * floating at the foot. On a large screen the navy sidebar holds the logo,
 * the places and the account; the content widens, and an `aside` stands
 * as a second column at the right, staying in view as the page scrolls.
 * On a phone the aside comes first or last, as `asideFirst` says.
 */
export function Screen({
  member,
  nav = true,
  account = true,
  back,
  band,
  aside,
  asideFirst = false,
  width = "wide",
  children,
}: {
  /** A vendor's member: Fleet in the places, Team for the owner. */
  member?: { owner: boolean };
  /** The places, in the sidebar; off for someone not let in yet. */
  nav?: boolean;
  /** The account menu at the band's right; off for a visitor signed out. */
  account?: boolean;
  /** A screen under another: the way back, in place of the logo. */
  back?: { href: string; label: string };
  /** The heading inside the band: the greeting, the job's time, a title. */
  band?: ReactNode;
  /** The second column on a large screen. */
  aside?: ReactNode;
  /** On a phone, the aside before the rest. */
  asideFirst?: boolean;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const column = cx("mx-auto w-full max-w-xl", WIDTHS[width]);
  return (
    <div
      className={cx(
        "min-h-dvh",
        // The sidebar's ink runs the page's full height, past its own foot.
        nav &&
          "lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,var(--ink)_15.5rem,transparent_15.5rem)]",
      )}
    >
      {nav ? <Sidebar member={member} /> : null}
      <div
        className={cx(
          member
            ? "pb-32 lg:pb-16"
            : "pb-[max(env(safe-area-inset-bottom),2.5rem)] lg:pb-16",
        )}
      >
        <header className="bg-band text-white shadow-band">
          <div
            className={cx(
              column,
              "px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-14 lg:px-10 lg:pt-8 lg:pb-20",
            )}
          >
            <div
              className={cx(
                "flex h-12 items-center justify-between gap-3",
                // The sidebar has the logo and the account.
                nav && !back && "lg:hidden",
              )}
            >
              {back ? (
                <Link
                  href={back.href}
                  className="-ml-2 flex h-10 items-center gap-1 rounded-control pr-3 pl-1 text-sm font-semibold text-azure-light transition-colors hover:bg-white/10 focus-ring focus-ring-dark"
                >
                  <ChevronLeftIcon className="size-5" />
                  {back.label}
                </Link>
              ) : (
                <Link
                  href={HOME_PATH}
                  className="flex items-center gap-2.5 rounded-md focus-ring focus-ring-dark"
                  aria-label="Heavenly Travel Connect, home"
                >
                  <Logo tone="white" alt="" loading="eager" className="h-7" />
                </Link>
              )}
              {account ? (
                <span
                  className={cx(
                    "grid size-10 place-items-center rounded-full ring-2 ring-white/15",
                    nav && "lg:hidden",
                  )}
                >
                  <AccountMenu accountHref={ACCOUNT_PATH} />
                </span>
              ) : null}
            </div>
            {band ? (
              <div className={cx("mt-5", nav && !back && "lg:mt-0")}>
                {band}
              </div>
            ) : null}
          </div>
        </header>
        <main
          className={cx(
            column,
            "connect-main relative -mt-9 grid gap-6 px-4 lg:-mt-12 lg:px-10",
            aside
              ? "lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]"
              : null,
          )}
        >
          <div
            className={cx(
              "connect-col grid min-w-0 content-start gap-6",
              aside ? "lg:col-start-1 lg:row-start-1" : null,
              (!aside || !asideFirst) && "connect-lead",
            )}
          >
            {children}
          </div>
          {aside ? (
            <aside
              className={cx(
                "connect-col grid min-w-0 content-start gap-6 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1",
                asideFirst ? "connect-lead -order-1 lg:order-none" : null,
              )}
            >
              {aside}
            </aside>
          ) : null}
        </main>
      </div>
      {member ? <TabBar owner={member.owner} /> : null}
    </div>
  );
}

/** A screen's heading in the band, as manage's dashboard has it: a kicker over a serif title, and a line under. */
export function BandHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="grid min-w-0 gap-1">
        {eyebrow ? (
          <p className="text-xs font-bold tracking-kicker text-azure-light uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 font-serif text-figure leading-display text-balance lg:text-4xl">
          {title}
        </h1>
        {children ? (
          <div className="mt-0.5 max-w-2xl text-sm text-white/80 lg:text-base">
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
