import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { SpinnerIcon } from "@repo/ui/icons";

/**
 * Presentational pieces the booking pages share, on the site's tokens
 * (docs/261029-design-tokens.md). The keyboard's ring is `focus-ring`, the
 * site's own: three pixels of azure, clear of the control.
 */

/** The one centred column of a booking or account page, under the site header. */
export const pageColumn =
  "mx-auto w-full max-w-[1100px] px-5 pt-6 pb-24 sm:px-8 sm:pt-10";

export const eyebrow =
  "text-xs font-bold tracking-eyebrow text-brand uppercase";

/**
 * A line that says what is under way, after a spinner: "Checking today's
 * prices…". A button that waits says so itself (`Button pending`).
 */
export function Pending({ children }: { children: ReactNode }) {
  return (
    <>
      <SpinnerIcon className="mr-2.5" />
      {children}
    </>
  );
}

export const control =
  "w-full rounded-xl border border-card-edge bg-white px-4 py-3 text-ink outline-none placeholder:text-muted focus:border-brand aria-invalid:border-danger data-placeholder:text-muted focus-ring";

/** The white card with the home page's shadow, its padding left to the caller. */
export const surface = "rounded-card bg-white shadow-card";

/** The white card with the home page's shadow, as a class for links and lists. */
export const panel = `${surface} p-5 sm:p-7`;

/** A `panel` from `lg` only: below it the content sits bare, in a card of the caller's. */
export const panelFromLarge =
  "lg:rounded-card lg:bg-white lg:p-7 lg:shadow-card";

export function PageTitle({
  eyebrow: above,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <p className={`${eyebrow} mb-2`}>{above}</p>
      <h1 className="font-serif text-display-sm leading-none">{title}</h1>
      {children && (
        <p className="mt-3 max-w-[60ch] text-base text-muted">{children}</p>
      )}
    </div>
  );
}

/** A white card with the home page's shadow. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${panel} ${className}`}>{children}</section>;
}

/**
 * Something stopped the flow: the reason and where to go instead, or
 * `action` in place of the link, such as a button that tries again.
 * `level` 1 when it is all the page shows, so its title is the page's.
 */
export function Stop({
  title,
  message,
  href = "/#booking",
  linkLabel = "Change the search",
  action,
  level = 2,
}: {
  title: string;
  message: string;
  href?: string;
  linkLabel?: string;
  action?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <Panel className="max-w-[560px]">
      <Heading className="font-serif text-figure leading-tight">
        {title}
      </Heading>
      <p className="mt-2 text-body">{message}</p>
      {action ?? (
        <Button asChild size="lg" className="mt-6">
          <Link href={href}>{linkLabel}</Link>
        </Button>
      )}
    </Panel>
  );
}
