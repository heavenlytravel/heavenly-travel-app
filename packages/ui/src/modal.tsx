"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { RemoveScroll } from "react-remove-scroll";
import { cx } from "./cx.js";

/**
 * The native `<dialog>` under a dialog, a sheet and an alert dialog, shown
 * as a modal while `open` and closed otherwise, so focus trapping, Escape,
 * the top layer and handing the focus back on close come from the browser.
 * One taken off the page while open, its caller gone, is closed first, so
 * the focus still goes back to where it was. Put the ref on the
 * `<dialog>`, and `onModalClose` as its `onClose`.
 */
export function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A layout effect's cleanup runs before the element leaves the page; a
  // dialog removed while open gives the focus back to nothing.
  useLayoutEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return ref;
}

/**
 * A modal's `onClose`: runs `close` once the browser has closed it, on
 * Escape or as `open` turns false. A close whose event comes after the
 * dialog was shown again is no close: React's strict mode runs the effects
 * of a dialog that mounts open twice, closing it and showing it again at
 * once.
 */
export function onModalClose(close: () => void) {
  return (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!event.currentTarget.open) close();
  };
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
