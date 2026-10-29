import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  type TripCategory,
} from "@repo/db";
import { InfoTip } from "@repo/ui/info-tip";
import type { ReactNode } from "react";
import { TileGrid } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { SectionHeader } from "@repo/console/SectionHeader";
import { Bone, TileGridSkeleton } from "@repo/console/Skeleton";

/**
 * One category of the classes, as the catalogue and a location's classes
 * both lay it out: its name, how many of its classes are on and its
 * switch's rule beside it, over a card per class, or a dashed slot saying
 * why it has none.
 */
export function ClassCategory({
  category,
  meta,
  tip,
  emptyMessage,
  children,
}: {
  category: TripCategory;
  /** How many are on: "2 of 3 active". */
  meta: string;
  /** What the classes' switch does. */
  tip: string;
  /** Shown when the category has no class; `children` is then empty. */
  emptyMessage: string | null;
  /** The classes' `Tile`s. */
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3">
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              {TRIP_CATEGORY_LABELS[category]}
              <InfoTip text={tip} />
            </span>
          }
          meta={meta}
        />
      </div>
      {emptyMessage ? (
        <EmptyState slot>{emptyMessage}</EmptyState>
      ) : (
        <TileGrid>{children}</TileGrid>
      )}
    </section>
  );
}

/** The categories while their classes load. */
export function ClassCategoriesSkeleton() {
  return (
    <div className="grid gap-8">
      {TRIP_CATEGORIES.map((category) => (
        <div key={category}>
          <Bone className="mb-3 h-6 w-40" />
          <TileGridSkeleton />
        </div>
      ))}
    </div>
  );
}
