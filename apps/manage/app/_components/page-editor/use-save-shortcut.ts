"use client";

import { useEffect, useRef } from "react";

/**
 * Ctrl+S or Cmd+S calls `save`, as an editor would, instead of the
 * browser's own save. `save` is read at the key press, so it sees the
 * form as it is then; it decides itself whether there is anything to save.
 */
export function useSaveShortcut(save: () => void) {
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
