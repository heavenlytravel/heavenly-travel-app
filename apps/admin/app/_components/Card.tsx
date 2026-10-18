import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";

/** The surface every card and frame shares: white, a hairline edge, a soft shadow. */
const SURFACE =
  "rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

/**
 * A white card, the console's unit of layout: one part of a page, its
 * title on top. Nothing inside a card has a frame of its own: a list in a
 * card is split by hairlines, and a table or the rate grid runs to the
 * card's edges in a `flush` card, under a `CardTitle` with `inset`.
 */
export function Card({
  id,
  flush = false,
  className,
  children,
}: {
  /** Names the card in the page's address, so a link can land on it. */
  id?: string;
  /** No padding: for a table or a grid that runs to the card's edges. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cx(
        "min-w-0",
        SURFACE,
        id && "scroll-mt-20",
        !flush && "p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  description,
  action,
  inset = false,
}: {
  children: ReactNode;
  description?: string;
  /** What stands at the right of the title: the card's one button. */
  action?: ReactNode;
  /** In a `flush` card: the title pads itself, and what follows runs to the edges. */
  inset?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-start justify-between gap-3",
        inset ? "px-6 pt-6 pb-5" : "mb-5",
      )}
    >
      <div className="min-w-0 grow basis-64">
        <h2 className="text-xl font-semibold tracking-tight">{children}</h2>
        {description ? (
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** The card's surface with nothing else: around a table that stands alone, or a figure. */
export function Frame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("min-w-0", SURFACE, className)}>{children}</div>;
}

const TILE_COLUMNS = {
  "14rem": "grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))]",
  "16rem": "grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))]",
  /** Always three from `sm`: for a fixed number of slots, the home page's top choices. */
  thirds: "sm:grid-cols-3",
} as const;

/** The cards of a grid fill as many columns as fit, none narrower than `min`. */
export function TileGrid({
  min = "16rem",
  children,
}: {
  min?: keyof typeof TILE_COLUMNS;
  children: ReactNode;
}) {
  return <ul className={cx("grid gap-4", TILE_COLUMNS[min])}>{children}</ul>;
}

/**
 * One card of a grid: a location, a page, a class, a top choice. Its
 * title's link covers it through `TILE_LINK`, so the whole card opens it;
 * anything else that takes a click stands above with `relative z-1`.
 */
export function Tile({
  dim = false,
  children,
}: {
  /** Off: the card in grey, still at hand. */
  dim?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="min-w-0">
      <article
        className={cx(
          "relative flex h-full flex-col overflow-hidden transition-shadow hover:border-neutral-300 hover:shadow-md",
          SURFACE,
          dim && "bg-neutral-50",
        )}
      >
        {children}
      </article>
    </li>
  );
}

/** The class of a tile's title link, whose box covers the tile. */
export const TILE_LINK =
  "after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-neutral-900";

/** The foot of a tile: its buttons, above the tile's link, on a hairline. */
export function TileFoot({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-1 mt-auto flex items-center gap-2 border-t border-neutral-100 px-4 py-3">
      {children}
    </div>
  );
}
