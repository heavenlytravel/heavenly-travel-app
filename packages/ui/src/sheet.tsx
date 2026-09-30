"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx.js";

const WIDTHS = {
  md: "ui:w-[min(22rem,88vw)]",
  lg: "ui:w-[min(32rem,92vw)]",
} as const;

const SIDES = {
  left: "ui:left-0 ui:right-auto",
  right: "ui:right-0 ui:left-auto",
} as const;

/**
 * A panel that slides in from an edge over a dimmed page: mobile navigation,
 * filters, a quick form. Built on the native `<dialog>`, so focus trapping,
 * Escape and the top layer come from the browser; a click on the dim
 * backdrop closes it too. Controlled: the parent owns `open`.
 */
export function Sheet({
  open,
  onOpenChange,
  side = "right",
  width = "md",
  title,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: keyof typeof SIDES;
  /** "md" for a short form, "lg" for one with many fields. */
  width?: keyof typeof WIDTHS;
  /** Read by screen readers as the dialog's name. */
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        // The dialog element itself is only hit through the backdrop.
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cx(
        "ui:fixed ui:inset-y-0 ui:m-0 ui:h-full ui:max-h-none ui:max-w-none ui:overflow-y-auto ui:bg-white ui:p-0 ui:text-inherit ui:shadow-[0_22px_55px_rgba(9,43,39,0.25)] ui:backdrop:bg-[#082f2b]/45",
        WIDTHS[width],
        SIDES[side],
        className,
      )}
    >
      {children}
    </dialog>
  );
}
