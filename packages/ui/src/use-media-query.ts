"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the screen matches a media query, such as `(min-width: 1024px)`,
 * kept in step as it changes. False on the server and in the first render,
 * so the markup matches what the server sent.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Whether the screen is phone-wide, below Tailwind's `sm`. A picker opens as
 * a sheet from the bottom there, and as a popover under its field above.
 */
export function useNarrow() {
  return useMediaQuery("(max-width: 639px)");
}
