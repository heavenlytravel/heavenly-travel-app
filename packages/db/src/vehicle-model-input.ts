import { refuse, type Change } from "./change";

/**
 * How a model is named, the Toyota Alphard in MPV VIP, and the rules on
 * its name, pure and browser-safe: the vehicle form types a model as a
 * brand and a name, "Toyota" and "Alphard", and the screens show both.
 * The writers in ./vehicle-models apply the same checks. See
 * docs/261019-vehicles-and-drivers.md, "Models".
 */

export const MODEL_LIMITS = { brand: 40, name: 60 } as const;

/** "Toyota Alphard": a model as the screens name it. A model named before brands were kept is its name alone. */
export function modelName(model: { brand: string; name: string }) {
  return model.brand ? `${model.brand} ${model.name}` : model.name;
}

/** A brand or a model as it is kept: trimmed, one space between words. */
export function squashName(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Two brands, or two models, that are the same one typed differently: "toyota" and "Toyota". */
export function sameName(a: string, b: string) {
  return squashName(a).toLowerCase() === squashName(b).toLowerCase();
}

/** "Toyota Vellfire or Toyota Alphard": the models a class card names, by their names. */
export function modelsLine(names: readonly string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

/**
 * The rules on a model's brand and name, as the vehicle form types them,
 * its fields `brand` and `model`; a field left out is not checked.
 */
export function checkModelName(fields: {
  brand?: string;
  name?: string;
}): Change {
  if (fields.brand !== undefined) {
    if (fields.brand === "")
      return refuse("Enter the brand, such as Toyota.", "brand");
    if (fields.brand.length > MODEL_LIMITS.brand) {
      return refuse(
        `A brand is at most ${MODEL_LIMITS.brand} characters.`,
        "brand",
      );
    }
  }
  if (fields.name !== undefined) {
    if (fields.name === "")
      return refuse("Enter the model, such as Alphard.", "model");
    if (fields.name.length > MODEL_LIMITS.name) {
      return refuse(
        `A model is at most ${MODEL_LIMITS.name} characters.`,
        "model",
      );
    }
  }
  return { ok: true };
}
