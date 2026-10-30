"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

/**
 * While `open`, puts away what `ref` holds (a menu, a panel) on Escape or
 * on a press anywhere outside it. `onDismiss` hears which: after Escape the
 * focus usually goes back to the button that opened it; after a press
 * outside it stays where the press put it. The press is heard as it
 * starts, before what was pressed acts on it, so a map or a canvas that
 * keeps its own presses still closes it.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: (by: "escape" | "outside") => void,
) {
  const dismiss = useEffectEvent(onDismiss);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss("escape");
    };
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) dismiss("outside");
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open, ref]);
}
