"use client";

import {
  createContext,
  useContext,
  useId,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cx } from "./cx.js";
import { CheckIcon } from "./icons.js";
import { InfoTip } from "./info-tip.js";
import { useFieldError } from "./validation.js";

/**
 * The classes of a text control, for inputs the package does not render
 * itself. A control the form refused (`aria-invalid`) turns red until it
 * is changed.
 */
export const inputClassName =
  "ui:h-10 ui:w-full ui:rounded-control ui:border ui:border-edge ui:bg-white ui:px-3 ui:text-sm ui:text-body ui:placeholder:text-muted ui:focus-visible:outline-2 ui:focus-visible:outline-offset-0 ui:focus-visible:outline-ring ui:disabled:cursor-not-allowed ui:disabled:bg-shade ui:disabled:text-muted ui:aria-invalid:border-danger ui:aria-invalid:focus-visible:outline-danger ui:pointer-coarse:h-11 ui:pointer-coarse:text-base";

/**
 * What a `Field` tells the control inside it: the id its label points at,
 * when the label cannot wrap it, and the id of its hint or error.
 */
const FieldContext = createContext<{
  id?: string;
  describedBy?: string;
} | null>(null);

/**
 * The `id` and `aria-describedby` a control takes from the `Field` around
 * it, unless it was given its own. Every control of the package reads it.
 */
export function useFieldControl(props: {
  id?: string;
  "aria-describedby"?: string;
}) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
  };
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  const field = useFieldControl(props);
  return (
    <input className={cx(inputClassName, className)} {...props} {...field} />
  );
}

/** A text control of several lines; `rows` sets its height. */
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const field = useFieldControl(props);
  return (
    <textarea
      className={cx(
        inputClassName,
        "ui:block ui:h-auto ui:py-2 ui:leading-relaxed ui:pointer-coarse:h-auto",
        className,
      )}
      {...props}
      {...field}
    />
  );
}

const LABEL = "ui:text-sm ui:font-medium ui:text-body";

/**
 * A label above a control, with an optional hint below it and an optional
 * `tip`, an "i" beside the label for one line of help. When the form
 * refuses the control on submit (a required field left empty, an email
 * without an @), the reason shows in place of the hint, in red, instead of
 * the browser's bubble; changing the control clears it. The hint and the
 * reason are tied to the control (`aria-describedby`), not read as part of
 * its name. The label wraps the control, so any control takes its name;
 * with a `tip`, whose button would take the label for itself, the label
 * points at the control by id instead, so the control must be one of the
 * package's, which take that id from here.
 */
export function Field({
  label,
  hint,
  tip,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  /** One line of help in an "i" beside the label. */
  tip?: string;
  className?: string;
  children: ReactNode;
}) {
  const { error, onInvalid, onInput } = useFieldError();
  const id = useId();
  const messageId = useId();
  const message = error ?? hint;
  return (
    <div
      className={cx("ui:block", className)}
      onInvalid={onInvalid}
      onInput={onInput}
    >
      <FieldContext.Provider
        value={{
          id: tip ? id : undefined,
          describedBy: message ? messageId : undefined,
        }}
      >
        {tip ? (
          <>
            <span className="ui:mb-1.5 ui:flex ui:items-center ui:gap-1.5">
              <label htmlFor={id} className={LABEL}>
                {label}
              </label>
              <InfoTip text={tip} />
            </span>
            {children}
          </>
        ) : (
          <label className="ui:block">
            <span className={cx("ui:mb-1.5 ui:block", LABEL)}>{label}</span>
            {children}
          </label>
        )}
      </FieldContext.Provider>
      {error ? (
        <span
          id={messageId}
          role="alert"
          className="ui:mt-1.5 ui:block ui:text-xs ui:text-danger"
        >
          {error}
        </span>
      ) : hint ? (
        <span
          id={messageId}
          className="ui:mt-1.5 ui:block ui:text-xs ui:text-muted"
        >
          {hint}
        </span>
      ) : null}
    </div>
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
        <p role="alert" className="ui:text-xs ui:text-danger">
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
        className="ui:peer ui:size-4 ui:shrink-0 ui:cursor-pointer ui:appearance-none ui:rounded-sm ui:border ui:border-edge-strong ui:bg-white ui:transition-colors ui:checked:border-primary ui:checked:bg-primary ui:aria-invalid:border-danger ui:focus-ring ui:disabled:cursor-not-allowed ui:disabled:opacity-50"
        {...props}
      />
      <CheckIcon
        strokeWidth={3}
        className="ui:pointer-events-none ui:absolute ui:inset-0 ui:m-auto ui:hidden ui:size-3 ui:text-primary-foreground ui:peer-checked:block"
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
        "ui:size-4 ui:shrink-0 ui:cursor-pointer ui:appearance-none ui:rounded-full ui:border ui:border-edge-strong ui:bg-white ui:transition-colors ui:checked:border-primary ui:checked:bg-primary ui:checked:shadow-[inset_0_0_0_3px_white] ui:aria-invalid:border-danger ui:focus-ring ui:disabled:cursor-not-allowed ui:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
