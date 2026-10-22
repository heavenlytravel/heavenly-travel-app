"use client";

import { DropdownMenu as Primitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx.js";
import { CheckIcon } from "./icons.js";

/**
 * A menu opened from a button, after shadcn's dropdown menu (Radix
 * underneath): a list of moves or links, walked with the arrows, chosen
 * with Enter, closed with Escape or a click outside. The trigger is the
 * caller's own button; each item is a `MenuItem`, a `Link` inside it with
 * `asChild`.
 */
export function Menu({
  trigger,
  align = "start",
  label,
  className,
  children,
}: {
  /** The button that opens it. */
  trigger: ReactNode;
  align?: "start" | "center" | "end";
  /** The menu's name for screen readers: "Locations". */
  label: string;
  /** On the menu's box: its width, say. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <Primitive.Root>
      <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          aria-label={label}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cx(
            "ui:z-50 ui:max-h-[var(--radix-dropdown-menu-content-available-height)] ui:min-w-56 ui:overflow-y-auto ui:rounded-popover ui:border ui:border-popover-line ui:bg-popover ui:p-1 ui:text-popover-foreground ui:shadow-lg",
            className,
          )}
        >
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

/**
 * One row of a menu: an icon or mark, its label, and at its end a note or
 * a tick for the row in force. `asChild` makes the child (a `Link`) the
 * row.
 */
export function MenuItem({
  current = false,
  className,
  ...props
}: ComponentProps<typeof Primitive.Item> & {
  /** The row in force, such as the scope picked: ticked at its end, and `aria-current`, which says chosen, not the page on screen. */
  current?: boolean;
}) {
  return (
    <Primitive.Item
      aria-current={current ? "true" : undefined}
      className={cx(
        "ui:relative ui:flex ui:w-full ui:cursor-default ui:items-center ui:gap-2 ui:rounded-sm ui:py-1.5 ui:pr-8 ui:pl-2 ui:text-sm ui:outline-hidden ui:select-none ui:data-disabled:pointer-events-none ui:data-disabled:opacity-50 ui:data-highlighted:bg-accent ui:data-highlighted:text-accent-foreground ui:[&>svg]:size-4 ui:[&>svg]:shrink-0",
        current && "ui:font-medium",
        className,
      )}
      {...props}
    />
  );
}

/** The tick at the end of the row in force, inside a `MenuItem`. */
export function MenuCheck() {
  return (
    <span className="ui:absolute ui:right-2 ui:flex ui:size-4 ui:items-center ui:justify-center ui:text-brand">
      <CheckIcon />
    </span>
  );
}

/** A small heading over a run of rows. */
export function MenuLabel({ className, ...props }: ComponentProps<"div">) {
  return (
    <Primitive.Label
      className={cx(
        "ui:px-2 ui:pt-2 ui:pb-1 ui:text-xs ui:font-medium ui:text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

/** A line between runs of rows. */
export function MenuSeparator({ className }: { className?: string }) {
  return (
    <Primitive.Separator
      className={cx("ui:-mx-1 ui:my-1 ui:h-px ui:bg-slate-200", className)}
    />
  );
}
