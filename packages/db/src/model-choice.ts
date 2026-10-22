import { chargeAmountSen } from "./pricing";
import type { SurchargeCharge } from "./rates-input";

/**
 * Choosing the model to ride in: what it costs on a trip, and which model
 * a choice names, read the same way by the quote, the booking and both
 * apps' forms. Pure and browser-safe. See
 * docs/261019-vehicles-and-drivers.md, "The customer's choice of model".
 */

/** What choosing a model costs on a trip: the location's charge, and what it comes to. */
export type ModelChoiceQuote = { charge: SurchargeCharge; amountSen: number };

/**
 * What choosing a model of a class costs on a trip: offered only where the
 * location charges for it and the class shows two models or more there,
 * a share of the trip's subtotal or an amount of its own; null otherwise.
 */
export function modelChoiceQuote(
  charge: SurchargeCharge | null,
  modelCount: number,
  subtotalSen: number,
): ModelChoiceQuote | null {
  if (!charge || modelCount < 2) return null;
  return { charge, amountSen: chargeAmountSen(charge, subtotalSen) };
}

/**
 * The model a choice names, when the class lets the customer choose here
 * (`choosable`) and it is one of the class's models; null for none, for
 * one gone from the list, or where choosing is not offered.
 */
export function choosableModel<Model extends { id: string }>(
  models: readonly Model[],
  choosable: boolean,
  modelId: string | null | undefined,
): Model | null {
  if (!choosable || !modelId) return null;
  return models.find((model) => model.id === modelId) ?? null;
}
