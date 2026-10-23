/** What each setting of trips across locations means for a trip from the location, in a sentence. */
export function crossLocationNote(
  crossLocation: boolean,
  locationName: string,
) {
  return crossLocation
    ? `Both ends map to ${locationName}'s zones, or a trip ends at another location's zone on a route out priced on this grid.`
    : `Both ends map to ${locationName}'s zones. A drop-off in another location's area is not priced, and the routes out on the grid are not sold.`;
}
