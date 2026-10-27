"use client";

import { useEffect, useRef, useState } from "react";

/**
 * What a link with today's one-trip address brought, taken into the plan
 * once the plan is read (`ready`), then out of the address, so a reload
 * does not take it again. The address is cleaned with the browser's own
 * history, which the router follows, not a navigation: a server action
 * started meanwhile would drop a navigation. True once taken, or when the
 * link brought nothing; until then the page holds its pricing.
 */
export function useLinkSeed(
  hasSeed: boolean,
  ready: boolean,
  adopt: () => Promise<unknown>,
  path: string,
) {
  const [adopted, setAdopted] = useState(!hasSeed);
  const started = useRef(false);
  useEffect(() => {
    if (adopted || !ready || started.current) return;
    started.current = true;
    void adopt().then(() => {
      window.history.replaceState(null, "", path);
      setAdopted(true);
    });
  });
  return adopted;
}
