"use client";

import { useRef, type ComponentProps } from "react";
import { cx } from "./cx.js";
import { inputClassName } from "./field.js";
import { MinusIcon, PlusIcon } from "./icons.js";

/**
 * A number with a minus and a plus beside it, in place of the browser's
 * spinner arrows, which are tiny and hard to hit. The field is the
 * browser's own number field without its arrows, so typing, `min`, `max`,
 * `step` and `required` work as before, controlled or not. The buttons step
 * it and fire the same change typing would.
 */
export function NumberField({
  className,
  disabled,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const ref = useRef<HTMLInputElement>(null);

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

  const button =
    "ui:inline-flex ui:size-10 ui:shrink-0 ui:items-center ui:justify-center ui:text-neutral-600 ui:transition-colors ui:hover:bg-neutral-100 ui:hover:text-neutral-900 ui:focus-visible:outline-2 ui:focus-visible:outline-neutral-900 ui:disabled:pointer-events-none ui:disabled:opacity-40";

  // The field comes first in the markup and the minus is drawn before it:
  // a label around the whole clicks its first control, which must be the
  // field and not the minus.
  return (
    <span
      className={cx(
        "ui:flex ui:w-full ui:items-stretch ui:overflow-hidden ui:rounded-md ui:border ui:border-neutral-300 ui:bg-white ui:has-[input:disabled]:bg-neutral-100 ui:has-[input[aria-invalid=true]]:border-red-500",
        className,
      )}
    >
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        disabled={disabled}
        className={cx(
          inputClassName,
          "ui:order-2 ui:h-10 ui:min-w-0 ui:flex-1 ui:rounded-none ui:border-0 ui:text-center ui:tabular-nums ui:[appearance:textfield] ui:[&::-webkit-inner-spin-button]:appearance-none ui:[&::-webkit-outer-spin-button]:appearance-none",
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Less"
        disabled={disabled}
        onClick={() => step(-1)}
        className={cx(button, "ui:order-1 ui:border-r ui:border-neutral-200")}
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="More"
        disabled={disabled}
        onClick={() => step(1)}
        className={cx(button, "ui:order-3 ui:border-l ui:border-neutral-200")}
      >
        <PlusIcon />
      </button>
    </span>
  );
}
