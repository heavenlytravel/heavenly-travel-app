import type { LocationFilterOption } from "../_components/LocationFilter";

/**
 * The choices of a location filter: "All locations", then every location
 * by name, each with the address `hrefOf` gives it; `hrefOf` keeps the
 * page's other filters. Server-side: the filter itself is a client
 * component and cannot take the function.
 */
export function locationFilterOptions(
  locations: readonly { id: string; name: string }[],
  hrefOf: (locationId: string | undefined) => string,
): LocationFilterOption[] {
  return [
    { value: "", label: "All locations", href: hrefOf(undefined) },
    ...locations.map((location) => ({
      value: location.id,
      label: location.name,
      href: hrefOf(location.id),
    })),
  ];
}
