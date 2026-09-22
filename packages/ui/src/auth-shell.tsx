import { type ReactNode } from "react";
import { cx } from "./cx.js";

const TONES = {
  /** Paper background, ink text. The customer site. */
  light: "ui:bg-[#fbfcfa] ui:text-[#102825]",
  /** Deep green background, pale text. The admin console. */
  dark: "ui:bg-[#073c36] ui:text-[#e6efed]",
} as const;

/**
 * The page around a sign-in or sign-up form, shared by both apps. From `lg`
 * up an optional `aside` (a photo panel) takes the left half and the form the
 * right; below that only the form column shows. The form column has a brand
 * slot at the top, an eyebrow line above the form and a footer at the bottom.
 * The form itself is whatever is passed as children, so swapping Clerk's
 * prebuilt component for a custom one later changes nothing here.
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
        {brand ? (
          <div className="ui:flex ui:justify-center ui:lg:justify-start">
            {brand}
          </div>
        ) : null}

        <main className="ui:flex ui:flex-1 ui:flex-col ui:items-center ui:justify-center ui:py-10">
          {eyebrow ? (
            <p
              className={cx(
                "ui:mb-6 ui:text-xs ui:font-semibold ui:tracking-[0.2em] ui:uppercase",
                tone === "dark" ? "ui:text-[#caa243]" : "ui:text-[#4a5f5b]",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          {children}
        </main>

        {footer ? (
          <footer
            className={cx(
              "ui:text-center ui:text-sm ui:lg:text-left",
              tone === "dark" ? "ui:text-[#b7cbc7]" : "ui:text-[#4a5f5b]",
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
