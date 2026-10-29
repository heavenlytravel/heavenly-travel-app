"use client";

import { useId, useState } from "react";
import { cx } from "./cx.js";

/**
 * A small "i" that shows a sentence on hover or focus, for the one line of
 * help a field or a heading needs without taking space on the screen. The
 * sentence is tied to the button (`aria-describedby`), so a screen reader
 * reads it after "More information". The pointer can move onto it to read
 * it, and Escape puts it away until the pointer or the focus leaves.
 */
export function InfoTip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  return (
    <span
      className={cx("ui:relative ui:inline-flex ui:group", className)}
      onMouseLeave={() => setDismissed(false)}
      onBlur={() => setDismissed(false)}
    >
      <button
        type="button"
        aria-label="More information"
        aria-describedby={id}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !dismissed) {
            // Only the tip: a dialog around it stays open.
            event.preventDefault();
            event.stopPropagation();
            setDismissed(true);
          }
        }}
        className="ui:touch-target ui:inline-flex ui:size-4 ui:items-center ui:justify-center ui:rounded-full ui:border ui:border-edge-strong ui:text-2xs ui:leading-none ui:font-semibold ui:text-muted ui:hover:border-body ui:hover:text-body ui:focus-ring"
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        // Out of the layout until shown: a hidden tip by the screen's right
        // edge would otherwise widen the page and let it scroll sideways.
        className={cx(
          "ui:absolute ui:top-full ui:left-1/2 ui:z-(--layer-popover) ui:mt-1.5 ui:hidden ui:w-64 ui:max-w-[calc(100vw-2rem)] ui:-translate-x-1/2 ui:rounded-md ui:bg-ink ui:px-3 ui:py-2 ui:text-xs ui:leading-snug ui:font-normal ui:text-white ui:normal-case ui:tracking-normal ui:shadow-lg",
          !dismissed && "ui:group-hover:block ui:group-focus-within:block",
        )}
      >
        {text}
      </span>
    </span>
  );
}
