/**
 * How many bookings one person may make from the website before we ask
 * them to call instead. Pure: the counts come from `countRecentBookings`
 * in ./bookings. The limits are generous for a person and tight for a bot;
 * they are tuned once real traffic shows what a busy agent does. See
 * docs/261008-guest-booking.md, "Abuse".
 */

const HOUR_MS = 60 * 60 * 1000;

export const BOOKING_RATE_LIMITS = {
  /** Bookings made with one contact email. */
  email: { windowHours: 24, limit: 3 },
  /** Bookings made from one address. */
  ip: { windowHours: 1, limit: 10 },
} as const;

export type RateLimitKey = keyof typeof BOOKING_RATE_LIMITS;

/** The instant each window opens, counting back from `now`. */
export function rateLimitWindows(now: Date): Record<RateLimitKey, Date> {
  const since = (hours: number) => new Date(now.getTime() - hours * HOUR_MS);
  return {
    email: since(BOOKING_RATE_LIMITS.email.windowHours),
    ip: since(BOOKING_RATE_LIMITS.ip.windowHours),
  };
}

/**
 * Whether one more booking is allowed, given how many each key has made in
 * its window. A key with no count, as the address of a request that
 * carries none, does not block.
 */
export function rateLimitDecision(
  counts: Partial<Record<RateLimitKey, number>>,
): boolean {
  return (Object.keys(BOOKING_RATE_LIMITS) as RateLimitKey[]).every((key) => {
    const count = counts[key];
    return count === undefined || count < BOOKING_RATE_LIMITS[key].limit;
  });
}

/** What the website says when the limit, or the honeypot, stops a booking. */
export const RATE_LIMITED_MESSAGE =
  "Too many requests. Call us and we will book it for you.";
