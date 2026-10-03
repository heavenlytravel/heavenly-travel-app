import { type ComponentProps, type ReactNode } from "react";
import { cx } from "./cx.js";

/** The classes of a text control, for inputs the package does not render itself. */
export const inputClassName =
  "ui:h-10 ui:w-full ui:rounded-md ui:border ui:border-neutral-300 ui:bg-white ui:px-3 ui:text-sm ui:text-neutral-900 ui:placeholder:text-neutral-400 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-0 ui:focus-visible:outline-neutral-900 ui:disabled:bg-neutral-100 ui:disabled:text-neutral-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputClassName, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(inputClassName, className)} {...props} />;
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

/** A label above a control, with an optional hint below it. */
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
  return (
    <label className={cx("ui:block", className)}>
      <span className="ui:mb-1.5 ui:block ui:text-sm ui:font-medium ui:text-neutral-800">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="ui:mt-1.5 ui:block ui:text-xs ui:text-neutral-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
