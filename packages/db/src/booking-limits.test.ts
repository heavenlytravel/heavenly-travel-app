import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_RATE_LIMITS,
  rateLimitDecision,
  rateLimitWindows,
} from "./booking-limits";

const HOUR = 60 * 60 * 1000;

describe("rateLimitWindows", () => {
  it("opens each window its length before now", () => {
    const now = new Date("2026-10-08T10:00:00Z");
    const windows = rateLimitWindows(now);
    assert.equal(windows.email.getTime(), now.getTime() - 24 * HOUR);
    assert.equal(windows.ip.getTime(), now.getTime() - 1 * HOUR);
  });
});

describe("rateLimitDecision", () => {
  it("allows a booking under both limits", () => {
    assert.equal(rateLimitDecision({ email: 0, ip: 0 }), true);
    assert.equal(
      rateLimitDecision({
        email: BOOKING_RATE_LIMITS.email.limit - 1,
        ip: BOOKING_RATE_LIMITS.ip.limit - 1,
      }),
      true,
    );
  });

  it("stops the booking that would pass either limit", () => {
    assert.equal(
      rateLimitDecision({ email: BOOKING_RATE_LIMITS.email.limit, ip: 0 }),
      false,
    );
    assert.equal(
      rateLimitDecision({ email: 0, ip: BOOKING_RATE_LIMITS.ip.limit }),
      false,
    );
  });

  it("ignores a key with no count", () => {
    assert.equal(rateLimitDecision({ email: 0 }), true);
    assert.equal(rateLimitDecision({}), true);
    assert.equal(
      rateLimitDecision({ email: BOOKING_RATE_LIMITS.email.limit }),
      false,
    );
  });
});
