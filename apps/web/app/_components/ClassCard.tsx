import type { ReactNode } from "react";
import { seatsLabel } from "@repo/db";
import { surface } from "../(site)/_components/Page";
import { ClassPicture } from "./ClassPicture";

/** What a vehicle class card shows of the class. */
export type ClassCardData = {
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  /** The catalogue's pictures of it, the cover first; empty for none. */
  imageUrls: readonly string[];
  /** Its category, whose vehicle stands in for no picture. */
  category: string;
};

/**
 * A vehicle class as a card, the same on a location's pages and on the
 * vehicle page of a booking: its pictures across the card's top, edge to
 * edge, then its name, blurb, seats and luggage, then the page's own
 * foot, a starting price or a button to choose it. `badge` sits beside
 * the name.
 */
export function ClassCard({
  vehicleClass,
  badge,
  children,
}: {
  vehicleClass: ClassCardData;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={`${surface} flex flex-col overflow-hidden`}>
      <ClassPicture
        pictures={vehicleClass.imageUrls}
        category={vehicleClass.category}
        sizes="(min-width: 64rem) 400px, (min-width: 40rem) 50vw, 100vw"
      />
      <div className="flex flex-1 flex-col p-5 sm:p-7">
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
      </div>
    </li>
  );
}
