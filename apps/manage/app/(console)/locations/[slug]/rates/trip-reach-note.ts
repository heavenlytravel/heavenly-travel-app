/** What cross-location means for a trip from the location, in a sentence. */
export function crossLocationNote(
  crossLocation: boolean,
  locationName: string,
) {
  return crossLocation
    ? `A trip may also end in another location's zone, on a route out priced on this grid.`
    : `Trips start and end in ${locationName}'s zones. Routes out on the grid are kept but not sold.`;
}

/**
 * The extra road's two settings worked through for an address, in a
 * sentence: what one a little past the free km pays, and where the
 * furthest ends.
 */
export function extraRoadNote(freeExtraKm: number, maxExtraKm: number) {
  const whatsApp = `Past ${maxExtraKm} km, the customer is sent to WhatsApp.`;
  if (freeExtraKm >= maxExtraKm) {
    return `The extra road is free all the way. ${whatsApp}`;
  }
  const past = Math.min(maxExtraKm, freeExtraKm + 2);
  const paid = past - freeExtraKm;
  const free =
    freeExtraKm > 0
      ? `The first ${freeExtraKm} km past a zone's edge are free. `
      : "";
  return `${free}An address ${past} km past the edge pays ${paid} km at the class's rate per extra km, rounded up to the km. ${whatsApp}`;
}
