import type { ReactNode } from "react";
import { modelsLine, seatsLabel } from "@repo/db";
import { panel } from "../(site)/_components/Page";
import { ClassPicture } from "./ClassPicture";
import { ModelPhotosButton, type GalleryModel } from "./ModelGallery";

/** What a vehicle class card shows of the class. */
export type ClassCardData = {
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  /** Its picture at the location; null for none. */
  imageUrl: string | null;
  models: readonly GalleryModel[];
};

/**
 * A vehicle class as a card, the same on a location's pages and on the
 * vehicle page of a booking: its picture, name, blurb, models with their
 * photos, seats and luggage, then the page's own foot, a starting price
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
      {vehicleClass.models.length > 0 ? (
        // A div, not a p: the gallery's dialog is not phrasing content.
        <div className="mt-2 text-copy text-body">
          {modelsLine(vehicleClass.models.map((m) => m.name))}, or similar.{" "}
          <ModelPhotosButton
            title={vehicleClass.name}
            models={vehicleClass.models}
          />
        </div>
      ) : null}
      <p className="mt-3 text-copy text-muted">
        {seatsLabel(vehicleClass)} · {vehicleClass.luggage}
      </p>
      {children}
    </li>
  );
}
