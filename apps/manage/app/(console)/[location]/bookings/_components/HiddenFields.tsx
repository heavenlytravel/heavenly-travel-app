/**
 * What a booking form posts, as hidden inputs: each trip under
 * `tripItemField` with its number, the vehicle and the details once
 * (`tripFields`, `vehicleFields` and `detailsFields` in ../_lib/trip-form).
 * The steps' own inputs have no names, so what a folded step holds still
 * posts, and the actions parse it with the website's parser and price the
 * trips again; nothing from the browser is trusted. A name may repeat, as
 * pairs: one per language of the tour guide.
 */
export function HiddenFields({
  fields,
}: {
  fields: Readonly<Record<string, string>> | readonly [string, string][];
}) {
  const pairs = Array.isArray(fields) ? fields : Object.entries(fields);
  return pairs.map(([name, value], index) => (
    <input key={`${name}:${index}`} type="hidden" name={name} value={value} />
  ));
}
