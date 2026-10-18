"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * What a control drawn by the package posts with its form and what
 * `required` checks: a real input, out of sight and out of the tab order,
 * holding the control's value. Nothing when the control has neither a name
 * nor `required`. `control` is the part the admin sees: a refused value
 * marks it and hands it the focus, and a new value clears the mark and
 * tells the field around it, as typing would. `missing` is what the field
 * says when `required` finds it empty.
 */
export function FormValue({
  name,
  value,
  required,
  control,
  missing,
}: {
  name?: string;
  value: string;
  required?: boolean;
  control?: RefObject<HTMLElement | null>;
  missing?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const last = useRef(value);

  useEffect(() => {
    if (last.current === value) return;
    last.current = value;
    control?.current?.removeAttribute("aria-invalid");
    ref.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [value, control]);

  if (!name && !required) return null;
  return (
    <input
      ref={ref}
      tabIndex={-1}
      aria-hidden="true"
      name={name}
      value={value}
      required={required}
      data-missing={missing}
      onChange={() => {}}
      onInvalid={() => control?.current?.setAttribute("aria-invalid", "true")}
      onFocus={() => {
        const shown = control?.current;
        const target = shown?.matches("button, input, select, textarea")
          ? shown
          : shown?.querySelector("button");
        target?.focus();
      }}
      className="ui:pointer-events-none ui:absolute ui:size-px ui:opacity-0"
    />
  );
}
