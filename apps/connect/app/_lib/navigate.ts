/**
 * Links that open a stop in the navigation apps Malaysian drivers use,
 * Waze and Google Maps, routing there from where the phone is.
 */
export function wazeHref(stop: { lat: number; lng: number }) {
  return `https://waze.com/ul?ll=${stop.lat},${stop.lng}&navigate=yes`;
}

export function googleMapsHref(stop: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
}
