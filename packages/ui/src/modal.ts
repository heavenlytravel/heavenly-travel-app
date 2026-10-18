"use client";

import { useEffect, useRef } from "react";

/**
 * The native `<dialog>` under a dialog, a sheet and an alert dialog, shown
 * as a modal while `open` and closed otherwise, so focus trapping, Escape
 * and the top layer come from the browser. Put the ref on the `<dialog>`.
 */
export function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return ref;
}
