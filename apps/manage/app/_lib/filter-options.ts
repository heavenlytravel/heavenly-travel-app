import type { FilterSelectOption } from "../_components/FilterSelect";

/**
 * The choices of a filter: `all` ("All statuses") worth "", then each
 * choice, each with the address `hrefOf` gives it; `hrefOf` keeps the
 * page's other filters. Server-side: the filter itself is a client
 * component and cannot take the function.
 */
export function filterOptions<Value extends string>(
  all: string,
  choices: readonly { value: Value; label: string }[],
  hrefOf: (value: Value | undefined) => string,
): FilterSelectOption[] {
  return [
    { value: "", label: all, href: hrefOf(undefined) },
    ...choices.map((choice) => ({ ...choice, href: hrefOf(choice.value) })),
  ];
}

/** The choices of a location filter: "All locations", then every location by name. */
export function locationFilterOptions(
  locations: readonly { id: string; name: string }[],
  hrefOf: (locationId: string | undefined) => string,
): FilterSelectOption[] {
  return filterOptions(
    "All locations",
    locations.map((location) => ({ value: location.id, label: location.name })),
    hrefOf,
  );
}
