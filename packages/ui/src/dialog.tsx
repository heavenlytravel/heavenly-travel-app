"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx.js";
import { XIcon } from "./icons.js";
import { ModalBody, onModalClose, useModal } from "./modal.js";

const WIDTHS = {
  sm: "ui:w-[min(28rem,92vw)]",
  md: "ui:w-[min(36rem,92vw)]",
  /** Two columns side by side: a comparison. */
  lg: "ui:w-[min(64rem,94vw)]",
} as const;

/**
 * A modal in the middle of a dimmed page, for a short task that needs its
 * own room: add a route to a grid, confirm a choice with a field or two.
 * Built on the native `<dialog>`, as the sheet is, so focus trapping,
 * Escape and the top layer come from the browser; a click on the dim
 * backdrop or the cross closes it, and the page under it holds still while
 * it is open. Controlled: the parent owns `open`. The
 * title and the line under it name the dialog for screen readers; the
 * caller puts the fields and the buttons inside. The inside scrolls past
 * `--dialog-height`, which a child that fits itself in, a photo, reads.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  width = "sm",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  const ref = useModal(open);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onModalClose(() => onOpenChange(false))}
      onClick={(event) => {
        // The dialog element itself is only hit through the backdrop.
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cx(
        "ui:m-auto ui:max-h-none ui:overflow-hidden ui:rounded-xl ui:border ui:border-neutral-200 ui:bg-white ui:p-0 ui:text-inherit ui:shadow-[0_22px_55px_rgba(9,43,39,0.25)] ui:backdrop:bg-[#082f2b]/45 ui:[--dialog-height:min(48rem,90dvh)]",
        WIDTHS[width],
        className,
      )}
    >
      <ModalBody open={open} className="ui:max-h-(--dialog-height)">
        {open ? (
          <div className="ui:grid ui:gap-4 ui:p-5">
            <div className="ui:flex ui:items-start ui:gap-4">
              <div className="ui:min-w-0 ui:flex-1">
                <h2
                  id={titleId}
                  className="ui:text-base ui:font-semibold ui:tracking-tight"
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    id={descriptionId}
                    className="ui:mt-1 ui:text-sm ui:text-neutral-600"
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
                className="ui:-mt-1 ui:-mr-1 ui:inline-flex ui:size-8 ui:shrink-0 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-500 ui:transition-colors ui:hover:bg-neutral-100 ui:hover:text-neutral-900 ui:focus-visible:outline-2 ui:focus-visible:outline-neutral-900"
              >
                <XIcon />
              </button>
            </div>
            {children}
          </div>
        ) : null}
      </ModalBody>
    </dialog>
  );
}
