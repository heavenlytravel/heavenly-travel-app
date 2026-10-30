"use client";

import { useRef, type ComponentProps } from "react";
import { cx } from "./cx.js";
import { inputClassName, useFieldControl } from "./field.js";
import { MinusIcon, PlusIcon } from "./icons.js";

/**
 * A number with a minus and a plus beside it, in place of the browser's
 * spinner arrows, which are tiny and hard to hit. The field is the
 * browser's own number field without its arrows, so typing, `min`, `max`,
 * `step` and `required` work as before, controlled or not. The buttons step
 * it and fire the same change typing would. `bare` drops the box and
 * draws the buttons as rings, for a field whose box is drawn around it;
 * `className` is the box either way.
 */
export function NumberField({
  className,
  disabled,
  bare = false,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { bare?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const field = useFieldControl(props);

  function step(by: 1 | -1) {
    const input = ref.current;
    if (!input) return;
    if (input.value === "") {
      // The prototype's setter, past React's own, so React sees the change.
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, input.min || "0");
    } else if (by === 1) {
      input.stepUp();
    } else {
      input.stepDown();
    }
    // Typing fires "input"; React hears the step as a change the same way.
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const button = cx(
    "ui:inline-flex ui:shrink-0 ui:items-center ui:justify-center ui:text-muted ui:transition-colors ui:hover:bg-accent ui:hover:text-accent-foreground ui:disabled:pointer-events-none ui:disabled:opacity-50",
    bare
      ? "ui:touch-target ui:size-8 ui:self-center ui:rounded-full ui:border ui:border-edge"
      : "ui:aspect-square ui:h-full",
  );

  // The field comes first in the markup and the minus is drawn before it:
  // a label around the whole clicks its first control, which must be the
  // field and not the minus.
  return (
    <span
      className={cx(
        bare
          ? "ui:flex ui:w-full ui:items-center ui:gap-2"
          : "ui:flex ui:h-10 ui:w-full ui:items-stretch ui:overflow-hidden ui:rounded-control ui:border ui:border-edge ui:bg-white ui:pointer-coarse:h-11 ui:has-[input:disabled]:bg-shade ui:has-[input:focus-visible]:outline-2 ui:has-[input:focus-visible]:outline-ring ui:has-[input[aria-invalid=true]]:border-danger",
        className,
      )}
    >
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        disabled={disabled}
        className={cx(
          bare
            ? "ui:min-w-0 ui:bg-transparent ui:outline-none"
            : cx(
                inputClassName,
                "ui:h-full ui:rounded-none ui:border-0 ui:outline-none ui:pointer-coarse:h-full",
              ),
          "ui:order-2 ui:min-w-0 ui:flex-1 ui:text-center ui:tabular-nums ui:[appearance:textfield] ui:[&::-webkit-inner-spin-button]:appearance-none ui:[&::-webkit-outer-spin-button]:appearance-none",
        )}
        {...props}
        {...field}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Less"
        disabled={disabled}
        onClick={() => step(-1)}
        className={cx(
          button,
          "ui:order-1",
          !bare && "ui:border-r ui:border-hairline",
        )}
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="More"
        disabled={disabled}
        onClick={() => step(1)}
        className={cx(
          button,
          "ui:order-3",
          !bare && "ui:border-l ui:border-hairline",
        )}
      >
        <PlusIcon />
      </button>
    </span>
  );
}
