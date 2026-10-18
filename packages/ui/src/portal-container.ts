"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Where a floating part (a tooltip, a select's list, a calendar) is put in
 * the page: the native `<dialog>` it sits in, or the body. A modal dialog is
 * in the browser's top layer and makes the rest of the page inert, so a part
 * put in the body would open under it and could not be clicked. Put `ref`
 * on the trigger and pass `container` to the Radix `Portal`; `trigger`
 * holds the trigger itself.
 */
export function usePortalContainer() {
  const [container, setContainer] = useState<HTMLElement | undefined>();
  const trigger = useRef<HTMLElement | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    trigger.current = node;
    setContainer(node?.closest("dialog") ?? undefined);
  }, []);
  return { ref, container, trigger };
}
