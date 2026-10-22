import type { BookingWithItems } from "@repo/db/server";

/** The locations a booking's items pick up in, each once, in the items' order. */
export function bookingLocations(
  booking: BookingWithItems,
): { name: string; slug: string }[] {
  const seen = new Map<string, { name: string; slug: string }>();
  for (const item of booking.items) {
    if (item.location && !seen.has(item.location.id)) {
      seen.set(item.location.id, {
        name: item.location.name,
        slug: item.location.slug,
      });
    }
  }
  return [...seen.values()];
}
