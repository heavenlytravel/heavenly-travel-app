"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the screen is phone-wide, below Tailwind's `sm`. A picker opens as
 * a sheet from the bottom there, and as a popover under its field above.
 * False on the server and in the first render, so the markup matches.
 */
export function useNarrow() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
