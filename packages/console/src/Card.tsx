import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";

/** The surface every card and frame shares: white, 14px corners, a hairline edge, a soft navy shadow. */
export const SURFACE =
  "rounded-card border border-card-edge bg-white shadow-card";

/**
 * A white card, the console's unit of layout: one part of a page, its
 * title in a bar on top. Nothing inside a card has a frame of its own: a
 * list in a card is split by hairlines, and a table or the rate grid runs
 * to the card's edges in a `flush` card.
 */
export function Card({
  id,
  flush = false,
  className,
  children,
}: {
  /** Names the card in the page's address, so a link can land on it. */
  id?: string;
  /** No padding: for a table, a list of rows or a grid that runs to the card's edges. */
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
        id && "scroll-mt-24",
        !flush && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * A card's title, in a bar across its top over a hairline: its name, a
 * short note beside it ("14 trips", "Staff only"), and what stands at its
 * right, a link or the card's one button. In a padded card it reaches the
 * card's edges; in a `flush` one, `inset`, it pads itself. A longer
 * `description` sits under the name, small and grey.
 */
export function CardTitle({
  children,
  meta,
  description,
  action,
  inset = false,
}: {
  children: ReactNode;
  /** A short note beside the name. */
  meta?: ReactNode;
  /** A line under the name, for what the card holds that its name does not say. */
  description?: ReactNode;
  /** What stands at the right of the title: a link, the card's one button. */
  action?: ReactNode;
  /** In a `flush` card. */
  inset?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-hairline px-5 py-4",
        inset ? "" : "-mx-5 -mt-5 mb-5",
      )}
    >
      <div className="min-w-0 grow basis-56">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h2 className="text-copy font-bold tracking-title text-ink">
            {children}
          </h2>
          {meta ? (
            <span className="text-caption text-muted">{meta}</span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 text-caption text-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

/** A link at a card title's right: "All bookings →". */
export const CARD_LINK = "rounded-sm text-caption text-link";

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
 * One card of a grid: a page, a class, a top choice, an image. Its
 * title's link covers it with `card-link`, so the whole card opens it;
 * anything else that takes a click stands above with
 * `relative z-(--layer-raised)`.
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
          "relative flex h-full flex-col overflow-hidden transition-shadow hover:border-edge hover:shadow-raised",
          SURFACE,
          dim && "bg-shade",
        )}
      >
        {children}
      </article>
    </li>
  );
}

/** The foot of a tile: its buttons, above the tile's link, on a hairline. */
export function TileFoot({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-(--layer-raised) mt-auto flex items-center gap-2 border-t border-hairline px-4 py-3">
      {children}
    </div>
  );
}

/**
 * Rows split by hairlines across a `flush` card: a list of things, each
 * with its own line, as the dashboard's "Needs you" and a vehicle's
 * documents have.
 */
export function CardRows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-hairline">{children}</ul>;
}

/** One row of `CardRows`: what it is about at the left, what it leads to at the right. */
export function CardRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <li className={cx("flex items-center gap-3 px-5 py-3", className)}>
      {children}
    </li>
  );
}
