"use client";

import { useState, type ComponentProps } from "react";
import { cx } from "./cx.js";
import { inputClassName, useFieldControl } from "./field.js";
import { EyeIcon, EyeOffIcon } from "./icons.js";

/**
 * Sensitive details, a bank account number or an IC, kept out of sight
 * until asked for, as an app blurs an account's email: shown masked, with
 * an eye button that shows it whole and hides it again. Nothing is
 * remembered: a page opened again starts hidden.
 */

const EYE_BUTTON =
  "ui:inline-flex ui:size-7 ui:shrink-0 ui:items-center ui:justify-center ui:rounded-control ui:text-muted ui:transition-colors ui:hover:bg-shade ui:hover:text-ink ui:focus-ring";

/** A value shown masked ("•••• 4821"), the eye showing it whole. Nothing when it is empty. */
export function MaskedText({
  value,
  masked,
  label,
  className,
}: {
  value: string;
  /** What shows while hidden. */
  masked: string;
  /** What it is, for the button: "account number". */
  label: string;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  if (value === "") return null;
  return (
    <span className={cx("ui:inline-flex ui:items-center ui:gap-1", className)}>
      <span className="ui:tabular-nums">{shown ? value : masked}</span>
      <button
        type="button"
        className={EYE_BUTTON}
        aria-label={shown ? `Hide the ${label}` : `Show the ${label}`}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  );
}

/** A text box whose value shows as dots until its eye is pressed. Not a password box, so no password manager offers to save it. */
export function SecretInput({
  className,
  label,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  /** What it is, for the button: "account number". */
  label: string;
}) {
  const [shown, setShown] = useState(false);
  const field = useFieldControl(props);
  return (
    <span className="ui:relative ui:block">
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        className={cx(
          inputClassName,
          "ui:pr-10",
          !shown && "ui:[-webkit-text-security:disc]",
          className,
        )}
        {...props}
        {...field}
      />
      <button
        type="button"
        className={cx(
          EYE_BUTTON,
          "ui:absolute ui:top-1/2 ui:right-1.5 ui:-translate-y-1/2",
        )}
        aria-label={shown ? `Hide the ${label}` : `Show the ${label}`}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  );
}
