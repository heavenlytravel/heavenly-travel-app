"use client";

import { Popover, Portal } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import { Sheet } from "./sheet.js";
import { useNarrow } from "./use-media-query.js";

/**
 * Where a date or time field's picker opens: a popover under the field, or
 * on a phone a sheet from the bottom with room for a thumb. The sheet is put
 * in the page's dialog or the body, out of any `<label>` around the field,
 * so a tap inside it is not taken for a tap on the label. Controlled: the
 * field owns `open`. `container` is the field's `usePortalContainer`.
 */
export function Picker({
  open,
  onOpenChange,
  trigger,
  title,
  container,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The field's button. */
  trigger: ReactElement;
  /** The sheet's heading, and its name for screen readers. */
  title: string;
  container?: HTMLElement;
  children: ReactNode;
}) {
  const narrow = useNarrow();
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      {narrow ? (
        <Portal.Root container={container}>
          <Sheet
            open={open}
            onOpenChange={onOpenChange}
            side="bottom"
            title={title}
            className="ui:bg-popover ui:text-popover-foreground"
          >
            <div className="ui:px-4 ui:pt-2.5 ui:pb-5">
              <div
                aria-hidden="true"
                className="ui:mx-auto ui:mb-3 ui:h-1 ui:w-10 ui:rounded-full ui:bg-edge"
              />
              <p className="ui:mb-3 ui:text-base ui:font-semibold">{title}</p>
              {open ? children : null}
            </div>
          </Sheet>
        </Portal.Root>
      ) : (
        <Popover.Portal container={container}>
          <Popover.Content
            // The picker focuses its own day or time, not the first button.
            onOpenAutoFocus={(event) => event.preventDefault()}
            aria-label={title}
            align="start"
            sideOffset={4}
            collisionPadding={8}
            className="ui:z-(--layer-popover) ui:overflow-hidden ui:rounded-popover ui:border ui:border-popover-line ui:bg-popover ui:text-popover-foreground ui:shadow-lg ui:outline-none"
          >
            {children}
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}
