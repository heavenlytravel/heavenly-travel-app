"use client";

import { type ReactNode } from "react";
import { cx } from "./cx.js";
import { ModalBody, onModalClose, useModal } from "./modal.js";

const WIDTHS = {
  md: "ui:w-[min(22rem,88vw)]",
  lg: "ui:w-[min(32rem,92vw)]",
} as const;

const SIDES = {
  left: "ui:inset-y-0 ui:left-0 ui:right-auto ui:h-full ui:max-h-none",
  right: "ui:inset-y-0 ui:right-0 ui:left-auto ui:h-full ui:max-h-none",
  bottom:
    "ui:inset-x-0 ui:top-auto ui:bottom-0 ui:h-auto ui:max-h-[90dvh] ui:w-full ui:rounded-t-2xl",
} as const;

/**
 * A panel that slides in from an edge over a dimmed page: mobile navigation,
 * filters, a quick form, a picker on a phone from the bottom. Built on the
 * native `<dialog>`, so focus trapping, Escape and the top layer come from
 * the browser; a click on the dim backdrop closes it too. It slides out
 * the way it came (`.ui-sheet` in styles.css). Controlled: the parent
 * owns `open`.
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
  /** "md" for a short form, "lg" for one with many fields. A bottom sheet is full width. */
  width?: keyof typeof WIDTHS;
  /** Read by screen readers as the dialog's name. */
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useModal(open);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      data-side={side}
      onClose={onModalClose(() => onOpenChange(false))}
      onClick={(event) => {
        // The dialog element itself is only hit through the backdrop.
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cx(
        "ui-sheet ui:fixed ui:m-0 ui:max-w-none ui:overflow-hidden ui:bg-white ui:p-0 ui:text-inherit ui:shadow-[0_22px_55px_rgba(0,38,75,0.22)] ui:backdrop:bg-ink/45",
        side !== "bottom" && WIDTHS[width],
        SIDES[side],
        className,
      )}
    >
      <ModalBody open={open} className="ui:h-full ui:max-h-[inherit]">
        {children}
      </ModalBody>
    </dialog>
  );
}
