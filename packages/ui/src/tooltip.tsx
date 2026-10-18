"use client";

import { Tooltip as Primitive } from "radix-ui";
import type { ReactNode } from "react";
import { cx } from "./cx.js";
import { usePortalContainer } from "./portal-container.js";

/**
 * A short line shown on hover or keyboard focus, after shadcn's tooltip: the
 * name of an icon button, or why a button cannot be pressed. It replaces the
 * browser's own `title` tooltip, which waits, cannot be styled and never
 * shows on focus. The trigger is wrapped in a span, so a disabled button
 * still shows its reason. An icon button keeps its `aria-label` for screen
 * readers; the tooltip is for the eye.
 */
export function Tooltip({
  content,
  side = "top",
  className,
  children,
}: {
  /** Nothing to say: the child alone, no tooltip. */
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  /** On the wrapping span: its share of a flex row, say. */
  className?: string;
  children: ReactNode;
}) {
  const { ref, container } = usePortalContainer();
  if (!content) return <>{children}</>;
  return (
    <Primitive.Provider delayDuration={250} skipDelayDuration={100}>
      <Primitive.Root>
        <Primitive.Trigger asChild>
          <span ref={ref} className={cx("ui:inline-flex", className)}>
            {children}
          </span>
        </Primitive.Trigger>
        <Primitive.Portal container={container}>
          <Primitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className="ui:z-50 ui:max-w-64 ui:rounded-md ui:bg-neutral-900 ui:px-2.5 ui:py-1.5 ui:text-xs ui:leading-snug ui:font-normal ui:text-white ui:shadow-lg"
          >
            {content}
            <Primitive.Arrow className="ui:fill-neutral-900" />
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
