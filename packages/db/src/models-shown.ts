import { modelName } from "./vehicle-model-input";

/**
 * A class's models as one location's customers are sent them, from the
 * rows `modelsShownAt` (./vehicle-models) reads: the models of the
 * vehicles in service there. Pure and browser-safe. See
 * docs/261019-vehicles-and-drivers.md.
 */

/** A model as the customer is sent it: "Toyota Alphard". */
export type ShownModel = { id: string; name: string };

/** A row `modelsShownAt` read, named as the customer sees it. */
export function shownModel(row: {
  id: string;
  brand: string;
  name: string;
}): ShownModel {
  return { id: row.id, name: modelName(row) };
}
