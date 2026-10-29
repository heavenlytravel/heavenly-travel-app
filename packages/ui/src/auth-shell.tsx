import { type ReactNode } from "react";
import { cx } from "./cx.js";

const TONES = {
  /** Paper background, ink text. The customer site. */
  light: "ui:bg-slate-50 ui:text-slate-900",
  /** Navy deepening to ink, pale text. The admin console. */
  dark: "ui:bg-linear-160 ui:from-navy ui:to-ink ui:text-slate-100",
} as const;

/**
 * The page around a sign-in or sign-up form, shared by both apps. From `lg`
 * up an optional `aside` (a photo panel) takes the left half and the form the
 * right; below that only the form column shows. Above the form, centred, sit
 * the brand and an eyebrow line; a footer sits at the bottom. The form itself
 * is whatever is passed as children, so swapping Clerk's prebuilt component
 * for a custom one later changes nothing here.
 */
export function AuthShell({
  tone = "light",
  brand,
  aside,
  eyebrow,
  footer,
  children,
}: {
  tone?: keyof typeof TONES;
  brand?: ReactNode;
  aside?: ReactNode;
  eyebrow?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "ui:grid ui:min-h-svh ui:grid-cols-[minmax(0,1fr)]",
        aside ? "ui:lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : null,
        TONES[tone],
      )}
    >
      {aside ? (
        <aside className="ui:relative ui:hidden ui:overflow-hidden ui:lg:block">
          {aside}
        </aside>
      ) : null}

      <div className="ui:flex ui:min-h-svh ui:min-w-0 ui:flex-col ui:px-6 ui:py-7 ui:sm:px-10">
        <main className="ui:flex ui:flex-1 ui:flex-col ui:items-center ui:justify-center ui:py-10">
          {brand ? (
            <div className="ui:mb-8 ui:flex ui:justify-center">{brand}</div>
          ) : null}
          {eyebrow ? (
            <p
              className={cx(
                "ui:mb-6 ui:text-xs ui:font-semibold ui:tracking-eyebrow ui:uppercase",
                tone === "dark" ? "ui:text-azure-light" : "ui:text-slate-600",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          {children}
        </main>

        {footer ? (
          <div
            className={cx(
              "ui:text-center ui:text-sm",
              tone === "dark" ? "ui:text-slate-300" : "ui:text-slate-600",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
