"use client";

import { useState, type ComponentProps } from "react";
import { cx } from "./cx.js";
import { inputClassName, useFieldControl } from "./field.js";
import { EyeIcon, EyeOffIcon } from "./icons.js";
import { Tooltip } from "./tooltip.js";

/**
 * Sensitive details, a bank account number or an IC, kept out of sight
 * until asked for: in their place a made-up value of the same shape,
 * blurred, so the eye sees there is one, and how long, but nothing of it.
 * A click shows it whole and hides it again. Nothing is remembered: a page
 * opened again starts hidden. A password keeps the browser's own box
 * (`PasswordInput`), for the password managers.
 */

const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "0123456789";

/**
 * A stand-in of the same shape: a digit for a digit, a letter for a
 * letter, the rest (spaces, dashes, "@", ".") kept. From a fixed sequence,
 * not from the value, so it gives nothing of it away, and the server and
 * the browser draw the same.
 */
export function redactedLike(value: string): string {
  let state = 0x2545f491;
  const next = (alphabet: string) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return alphabet[Math.abs(state) % alphabet.length]!;
  };
  return Array.from(value, (char) => {
    if (/\d/.test(char)) return next(DIGITS);
    if (/\p{L}/u.test(char)) return next(LETTERS);
    return char;
  }).join("");
}

const BLURRED = "ui:select-none ui:blur-xs";

const EYE_BUTTON =
  "ui:inline-flex ui:size-7 ui:shrink-0 ui:items-center ui:justify-center ui:rounded-control ui:text-muted ui:transition-colors ui:hover:bg-shade ui:hover:text-ink ui:focus-ring";

/** A value shown blurred, a click showing it whole. Nothing when it is empty. */
export function MaskedText({
  value,
  label,
  className,
}: {
  value: string;
  /** What it is, for the tooltip and screen readers: "account number". */
  label: string;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  if (value === "") return null;
  return (
    <Tooltip
      content={
        shown ? `Click to hide the ${label}` : `Click to show the ${label}`
      }
    >
      <button
        type="button"
        className={cx(
          "ui:cursor-pointer ui:rounded-sm ui:text-left ui:tabular-nums ui:transition ui:hover:text-ink ui:focus-ring",
          !shown && BLURRED,
          className,
        )}
        aria-label={shown ? value : `The ${label}, hidden. Show it`}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        {shown ? value : redactedLike(value)}
      </button>
    </Tooltip>
  );
}

/**
 * A text box for a sensitive detail: blurred, as `MaskedText`, while it
 * is not being typed in, and shown while it is, or after its eye is
 * pressed. Not a password box, so no password manager offers to save it.
 */
export function SecretInput({
  className,
  label,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  ...props
}: Omit<ComponentProps<"input">, "type" | "value" | "defaultValue"> & {
  defaultValue?: string;
  /** What it is, for the button: "account number". */
  label: string;
}) {
  const [shown, setShown] = useState(false);
  const [typing, setTyping] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const field = useFieldControl(props);
  const hidden = !shown && !typing && value !== "";
  return (
    <span className="ui:relative ui:block">
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        className={cx(
          inputClassName,
          "ui:pr-10",
          hidden && "ui:text-transparent",
          className,
        )}
        {...props}
        {...field}
        defaultValue={defaultValue}
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event);
        }}
        onFocus={(event) => {
          setTyping(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setTyping(false);
          onBlur?.(event);
        }}
      />
      {hidden ? (
        <span
          aria-hidden
          className={cx(
            "ui:pointer-events-none ui:absolute ui:inset-y-0 ui:left-3 ui:right-10 ui:flex ui:items-center ui:overflow-hidden ui:text-sm ui:whitespace-pre ui:text-body ui:pointer-coarse:text-base",
            BLURRED,
          )}
        >
          {redactedLike(value)}
        </span>
      ) : null}
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

/**
 * The browser's password box with an eye to show what was typed: its dots
 * kept, so password managers know it, and offer to fill and save it.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  const field = useFieldControl(props);
  return (
    <span className="ui:relative ui:block">
      <input
        type={shown ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="none"
        className={cx(inputClassName, "ui:pr-10", className)}
        {...props}
        {...field}
      />
      <button
        type="button"
        className={cx(
          EYE_BUTTON,
          "ui:absolute ui:top-1/2 ui:right-1.5 ui:-translate-y-1/2",
        )}
        aria-label={shown ? "Hide the password" : "Show the password"}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  );
}
