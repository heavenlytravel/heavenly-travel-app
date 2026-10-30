"use client";

import { useEffect, useState } from "react";
import { untilLabel } from "../_lib/when";

/**
 * "in 1 h 20 min", kept true while the screen stays open. The server's
 * first guess may be a minute off the phone's, so the text alone may
 * differ on hydration.
 */
export function Countdown({ at }: { at: Date }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return <span suppressHydrationWarning>{untilLabel(at, now)}</span>;
}
