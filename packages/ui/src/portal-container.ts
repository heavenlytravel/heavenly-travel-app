"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Where a floating part (a tooltip, a select's list, a calendar) is put in
 * the page: the native `<dialog>` it sits in, the element in full screen
 * that holds it, or the body. A modal dialog and an element in full screen
 * are in the browser's top layer: a modal dialog makes the rest of the page
 * inert, so a part put in the body would open under it and could not be
 * clicked, and full screen shows nothing outside its element. Put `ref` on
 * the trigger and pass `container` to the Radix `Portal`; `trigger` holds
 * the trigger itself.
 */
export function usePortalContainer() {
  const [container, setContainer] = useState<HTMLElement | undefined>();
  const trigger = useRef<HTMLElement | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    trigger.current = node;
    setContainer(layerOf(node));
  }, []);
  // Full screen comes and goes while the trigger stays.
  useEffect(() => {
    const follow = () => setContainer(layerOf(trigger.current));
    document.addEventListener("fullscreenchange", follow);
    return () => document.removeEventListener("fullscreenchange", follow);
  }, []);
  return { ref, container, trigger };
}

/** The top layer a node is in: its dialog, or the element in full screen around it; none for the page. */
function layerOf(node: HTMLElement | null): HTMLElement | undefined {
  if (!node) return undefined;
  const dialog = node.closest("dialog");
  if (dialog) return dialog;
  const full = document.fullscreenElement;
  return full instanceof HTMLElement && full.contains(node) ? full : undefined;
}
