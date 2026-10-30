"use client";

import { Tooltip as Primitive } from "radix-ui";
import { isValidElement, useState, type ReactNode } from "react";
import { cx } from "./cx.js";
import { usePortalContainer } from "./portal-container.js";

/**
 * A short line shown on hover or keyboard focus, after shadcn's tooltip: the
 * name of an icon button, or why a button cannot be pressed. It replaces the
 * browser's own `title` tooltip, which waits, cannot be styled and never
 * shows on focus. The trigger is wrapped in a span, so a disabled button
 * still shows its reason. An icon button keeps its `aria-label` for screen
 * readers; the tooltip is for the eye. With `openOnClick` a click or a
 * tap shows it too, for text cut short whose whole a touch screen cannot
 * hover to read.
 */
export function Tooltip({
  content,
  side = "top",
  className,
  openOnClick = false,
  children,
}: {
  /** Nothing to say: the child alone, no tooltip. */
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  /** On the wrapping span: its share of a flex row, say. */
  className?: string;
  /** A click shows it as well as a hover; Radix closes it on the press otherwise. */
  openOnClick?: boolean;
  children: ReactNode;
}) {
  const { ref, container } = usePortalContainer();
  const [open, setOpen] = useState(false);
  if (!content) return <>{children}</>;
  // A disabled button takes no focus, so the span takes it for the reason.
  const disabledChild =
    isValidElement<{ disabled?: boolean }>(children) &&
    children.props.disabled === true;
  return (
    <Primitive.Provider delayDuration={250} skipDelayDuration={100}>
      <Primitive.Root open={open} onOpenChange={setOpen}>
        <Primitive.Trigger asChild>
          <span
            ref={ref}
            // The press closed it; the click that follows opens it again.
            onClick={openOnClick ? () => setOpen(true) : undefined}
            tabIndex={disabledChild ? 0 : undefined}
            className={cx(
              "ui:inline-flex",
              disabledChild && "ui:rounded-control ui:focus-ring",
              className,
            )}
          >
            {children}
          </span>
        </Primitive.Trigger>
        <Primitive.Portal container={container}>
          <Primitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className="ui:z-(--layer-popover) ui:max-w-64 ui:rounded-md ui:bg-ink ui:px-2.5 ui:py-1.5 ui:text-xs ui:leading-snug ui:font-normal ui:text-white ui:shadow-lg"
          >
            {content}
            <Primitive.Arrow className="ui:fill-ink" />
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
