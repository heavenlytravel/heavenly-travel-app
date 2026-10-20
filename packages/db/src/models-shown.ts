import { PHOTO_LIMITS, type Photo } from "./photos-input";
import { modelName } from "./vehicle-model-input";

/**
 * A class's models as one location's customers see them, and the class's
 * picture there, from the rows `modelsShownAt` (./vehicle-models) reads:
 * the models of the vehicles in service there, each with those vehicles'
 * photos. Pure and browser-safe. See docs/261019-vehicles-and-drivers.md.
 */

/** A model as the customer sees it: "Toyota Alphard", and the photos of its vehicles there. */
export type ShownModel = { id: string; name: string; photos: Photo[] };

/**
 * A row `modelsShownAt` read, named as the customer sees it, with its
 * vehicles' photos one after another: each vehicle's in its order, the
 * first 12 of them.
 */
export function shownModel(row: {
  id: string;
  brand: string;
  name: string;
  vehicles: { photos: Photo[] }[];
}): ShownModel {
  return {
    id: row.id,
    name: modelName(row),
    photos: row.vehicles
      .flatMap((vehicle) => vehicle.photos)
      .slice(0, PHOTO_LIMITS.photos),
  };
}

/**
 * A class's picture at a location: the first photo of the first vehicle
 * entered of those in service there with a photo, so a customer sees a
 * vehicle based where they book; the catalogue's neutral picture until one
 * has a photo; null for neither.
 */
export function classCoverOf(
  models: readonly { vehicles: { createdAt: Date; photos: Photo[] }[] }[],
  catalogueUrl: string | null,
): string | null {
  const first = models
    .flatMap((model) => model.vehicles)
    .filter((vehicle) => vehicle.photos.length > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  return first?.photos[0]?.url ?? catalogueUrl;
}
