import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLocalDate,
  formatLocalTime,
  localMinuteOfDay,
} from "./booking-rules";

describe("localMinuteOfDay", () => {
  it("reads the minute of the Malaysian day, whatever the runtime's zone", () => {
    // 15:30 UTC is 23:30 in Kuala Lumpur.
    assert.equal(localMinuteOfDay(new Date("2026-10-15T15:30:00Z")), 1410);
    // 16:00 UTC is midnight.
    assert.equal(localMinuteOfDay(new Date("2026-10-15T16:00:00Z")), 0);
    // 23:05 UTC is 07:05 the next day.
    assert.equal(localMinuteOfDay(new Date("2026-10-15T23:05:00Z")), 425);
  });
});

describe("formatLocalDate and formatLocalTime", () => {
  it("split an instant into the Malaysian day and time", () => {
    // 16:30 UTC on the 15th is 00:30 on the 16th in Kuala Lumpur.
    const instant = new Date("2026-10-15T16:30:00Z");
    assert.equal(formatLocalDate(instant), "Fri, 16 Oct 2026");
    assert.equal(formatLocalTime(instant), "00:30");
  });
});
