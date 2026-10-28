import type { ReactNode } from "react";

/**
 * The column a console page is read in: centred, up to 80rem, so a list,
 * the rate grid and a map take the room the sidebar leaves. A form keeps
 * its own narrower width (`FORM_WIDTH`).
 */
export function PageColumn({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mx-auto w-full max-w-7xl px-5 pt-8 pb-32 md:px-10 md:pt-10">
        {children}
      </div>
    </div>
  );
}

/** How wide a form grows in the page's column: as wide as its fields read well at. */
export const FORM_WIDTH = "max-w-5xl";

/**
 * A detail page under its header: the record's cards in the wide column,
 * and a narrow column of cards beside it. The two stand side by side when
 * the page's column has room for both, read off the column and not the
 * screen, since the column is narrower beside an open sidebar; otherwise
 * the narrow one follows the record. Without `side` the record has the
 * wide column alone.
 */
export function DetailColumns({
  main,
  side,
}: {
  main: ReactNode;
  side?: ReactNode;
}) {
  return (
    <div className="mt-6 @container">
      <div
        className={`grid gap-6 ${side ? "@3xl:grid-cols-[1fr_320px] @3xl:items-start" : ""}`}
      >
        <div className="grid min-w-0 gap-6">{main}</div>
        {side ? <div className="grid min-w-0 gap-6">{side}</div> : null}
      </div>
    </div>
  );
}
