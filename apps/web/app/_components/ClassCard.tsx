import type { ReactNode } from "react";
import { seatsLabel } from "@repo/db";
import { panel } from "../(site)/_components/Page";
import { ClassPicture } from "./ClassPicture";

/** What a vehicle class card shows of the class. */
export type ClassCardData = {
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  /** The catalogue's picture of it; null for none. */
  imageUrl: string | null;
};

/**
 * A vehicle class as a card, the same on a location's pages and on the
 * vehicle page of a booking: its picture, name, blurb, seats and
 * luggage, then the page's own foot, a starting price
 * or a button to choose it. `badge` sits beside the name. `pictured` is
 * false when no class of the list has a picture, so none leaves a gap.
 */
export function ClassCard({
  vehicleClass,
  pictured,
  badge,
  children,
}: {
  vehicleClass: ClassCardData;
  pictured: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={`${panel} flex flex-col`}>
      {pictured ? (
        <ClassPicture
          src={vehicleClass.imageUrl}
          sizes="(min-width: 64rem) 400px, (min-width: 40rem) 50vw, 100vw"
          className="mb-4"
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-2xl leading-tight text-ink">
          {vehicleClass.name}
        </h3>
        {badge}
      </div>
      <p className="mt-1.5 text-body">{vehicleClass.description}</p>
      <p className="mt-3 text-copy text-muted">
        {seatsLabel(vehicleClass)} · {vehicleClass.luggage}
      </p>
      {children}
    </li>
  );
}
