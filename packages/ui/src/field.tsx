"use client";

import { type ComponentProps, type ReactNode } from "react";
import { cx } from "./cx.js";
import { CheckIcon } from "./icons.js";
import { useFieldError } from "./validation.js";

/**
 * The classes of a text control, for inputs the package does not render
 * itself. A control the form refused (`aria-invalid`) turns red until it
 * is changed.
 */
export const inputClassName =
  "ui:h-10 ui:w-full ui:rounded-md ui:border ui:border-neutral-300 ui:bg-white ui:px-3 ui:text-sm ui:text-neutral-900 ui:placeholder:text-neutral-400 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-0 ui:focus-visible:outline-neutral-900 ui:disabled:bg-neutral-100 ui:disabled:text-neutral-500 ui:aria-invalid:border-red-500 ui:aria-invalid:focus-visible:outline-red-600";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputClassName, className)} {...props} />;
}

/** A text control of several lines; `rows` sets its height. */
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(
        inputClassName,
        "ui:block ui:h-auto ui:py-2 ui:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A label above a control, with an optional hint below it. When the form
 * refuses the control on submit (a required field left empty, an email
 * without an @), the reason shows in place of the hint, in red, instead of
 * the browser's bubble; changing the control clears it.
 */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { error, onInvalid, onInput } = useFieldError();
  return (
    <label
      className={cx("ui:block", className)}
      onInvalid={onInvalid}
      onInput={onInput}
    >
      <span className="ui:mb-1.5 ui:block ui:text-sm ui:font-medium ui:text-neutral-800">
        {label}
      </span>
      {children}
      {error ? (
        <span
          role="alert"
          className="ui:mt-1.5 ui:block ui:text-xs ui:text-red-700"
        >
          {error}
        </span>
      ) : hint ? (
        <span className="ui:mt-1.5 ui:block ui:text-xs ui:text-neutral-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Controls with one message between them and no label of their own to hang
 * it on: the radios of one choice, a box under a heading. Refused on
 * submit, the reason shows under them in red, as `Field` shows it.
 */
export function FieldGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { error, onInvalid, onInput } = useFieldError();
  return (
    <div className={className} onInvalid={onInvalid} onInput={onInput}>
      {children}
      {error ? (
        <p role="alert" className="ui:text-xs ui:text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A tick box, after shadcn's checkbox: the browser's own control underneath,
 * so a form posts it and a keyboard ticks it, drawn as a rounded square
 * that fills dark with a tick.
 */
export function Checkbox({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  return (
    <span
      className={cx(
        "ui:relative ui:inline-flex ui:size-4 ui:shrink-0",
        className,
      )}
    >
      <input
        type="checkbox"
        className="ui:peer ui:size-4 ui:shrink-0 ui:cursor-pointer ui:appearance-none ui:rounded-[4px] ui:border ui:border-neutral-300 ui:bg-white ui:transition-colors ui:checked:border-neutral-900 ui:checked:bg-neutral-900 ui:aria-invalid:border-red-500 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900 ui:disabled:cursor-not-allowed ui:disabled:opacity-50"
        {...props}
      />
      <CheckIcon
        strokeWidth={3}
        className="ui:pointer-events-none ui:absolute ui:inset-0 ui:m-auto ui:hidden ui:size-3 ui:text-white ui:peer-checked:block"
      />
    </span>
  );
}

/**
 * One choice of several, after shadcn's radio group item: the browser's own
 * control underneath, drawn as a ring that fills with a dot when chosen.
 */
export function Radio({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="radio"
      className={cx(
        "ui:size-4 ui:shrink-0 ui:cursor-pointer ui:appearance-none ui:rounded-full ui:border ui:border-neutral-300 ui:bg-white ui:transition-colors ui:checked:border-neutral-900 ui:checked:bg-neutral-900 ui:checked:shadow-[inset_0_0_0_3px_white] ui:aria-invalid:border-red-500 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900 ui:disabled:cursor-not-allowed ui:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
