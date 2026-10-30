import type { ReactNode } from "react";
import { TRIP_CATEGORY_LABELS, type TripCategory } from "@repo/db";
import { Bone } from "@repo/ui/skeleton";
import { PageTitle } from "../../../_components/Page";

/**
 * Pieces the vehicle and confirm steps share. Each step keeps its own
 * words; these hold what is the same on both.
 */

/** A step's title, its eyebrow naming the category, and how many trips when several. */
export function BookingStepTitle({
  category,
  count,
  title,
  children,
}: {
  category: TripCategory;
  count: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <PageTitle
      eyebrow={`${TRIP_CATEGORY_LABELS[category]}${count > 1 ? ` · ${count} trips` : ""}`}
      title={title}
    >
      {children}
    </PageTitle>
  );
}

/** Bones for the trips folded into one line on a phone; gone from `lg`, where the list shows. */
export function FoldedTripsBones({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-1.5 px-4 py-2.5 sm:px-5 lg:hidden ${className}`}>
      <Bone className="h-5 w-40" />
      <Bone className="h-5 w-56 max-w-full" />
    </div>
  );
}
