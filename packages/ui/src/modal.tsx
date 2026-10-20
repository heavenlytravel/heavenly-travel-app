"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RemoveScroll } from "react-remove-scroll";
import { cx } from "./cx.js";

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

/**
 * The inside of a modal, which scrolls when it is taller than its room:
 * `className` gives it its height. While it is open the page under it holds
 * still, as under Radix's own dialogs: the wheel and touch outside this
 * layer are stopped, the backdrop's too, and a scroll that reaches its end
 * goes no further. The page keeps its scroll bar, so nothing on it changes
 * width or moves.
 */
export function ModalBody({
  open,
  className,
  children,
}: {
  open: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <RemoveScroll
      enabled={open}
      allowPinchZoom
      removeScrollBar={false}
      className={cx("ui:overflow-y-auto", className)}
    >
      {children}
    </RemoveScroll>
  );
}
