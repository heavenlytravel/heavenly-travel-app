"use client";

import { useRef, useState, type FormEvent, type SyntheticEvent } from "react";

/** A control the browser checks: what `required`, `type`, `min` and the rest are on. */
type Checked = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** The plain sentence for why a control is refused, in place of the browser's bubble. */
export function validityMessage(control: Checked): string {
  const v = control.validity;
  if (v.valueMissing) {
    if (control.dataset.missing) return control.dataset.missing;
    if (control instanceof HTMLSelectElement) return "Choose one.";
    if (control.type === "checkbox") return "Tick this to go on.";
    if (control.type === "radio") return "Choose one.";
    return "Fill this in.";
  }
  if (v.typeMismatch) {
    return control.type === "email"
      ? "Enter an email address, such as name@example.com."
      : "Check this value.";
  }
  if (v.badInput) return "Enter a number.";
  const input = control instanceof HTMLInputElement ? control : null;
  if (v.rangeUnderflow && input) return `At least ${input.min}.`;
  if (v.rangeOverflow && input) return `At most ${input.max}.`;
  if (v.stepMismatch) return "Use a whole number.";
  if (v.tooShort && input) return `At least ${input.minLength} characters.`;
  if (v.tooLong && input) return `At most ${input.maxLength} characters.`;
  if (v.patternMismatch) return control.title || "Check the format.";
  return control.validationMessage;
}

/** True between the first refused control of a submit and the next task. */
let focusTaken = false;

/**
 * Handles a refused control: no browser bubble, the control marked, and
 * the first refused control of the submit given the focus, as the bubble
 * would have. Answers its message.
 */
function refuse(event: SyntheticEvent): string | null {
  const control = event.target;
  if (!(
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  )) {
    return null;
  }
  event.preventDefault();
  control.setAttribute("aria-invalid", "true");
  if (!focusTaken) {
    focusTaken = true;
    control.focus();
    setTimeout(() => {
      focusTaken = false;
    });
  }
  return validityMessage(control);
}

/** A control's mark taken off, and a reason the server gave for it. */
function unmark(control: Element) {
  control.removeAttribute("aria-invalid");
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  ) {
    control.setCustomValidity("");
  }
}

/**
 * The control a change came from, its mark cleared, and the marks of the
 * rest of its group when it is one of several of a name, radios or tick
 * boxes: one change answers them all.
 */
function cleared(event: SyntheticEvent) {
  const control = event.target;
  if (control instanceof HTMLInputElement && control.name) {
    const group = control.form?.elements.namedItem(control.name);
    if (group instanceof RadioNodeList) {
      for (const each of group) {
        if (each instanceof Element) unmark(each);
      }
    }
  }
  if (control instanceof Element) unmark(control);
  return control;
}

/**
 * Shows a reason the server gave for refusing one field the way a
 * refused control shows the browser's own: under it in red, the control
 * marked and given the focus, the mark gone once it changes. For a
 * control in a `Field`, a `FieldGroup` or a form with `useFormErrors`.
 * Answers false when nothing showed it, a hidden control or one with none
 * of those around it, so the caller shows the reason elsewhere.
 */
export function showFieldError(
  form: HTMLFormElement | null,
  name: string,
  message: string,
): boolean {
  const named = form?.elements.namedItem(name);
  const control = named instanceof RadioNodeList ? named[0] : named;
  if (
    !(
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
    ) ||
    !control.willValidate
  ) {
    return false;
  }
  control.setCustomValidity(message);
  // Fires `invalid` for the wrapper to show, without the browser's bubble.
  control.checkValidity();
  if (control.getAttribute("aria-invalid") === "true") return true;
  control.setCustomValidity("");
  return false;
}

/**
 * The message of one field, for a wrapper around its control: `Field` uses
 * it. React's `invalid` event bubbles, unlike the browser's, so the wrapper
 * hears its control refused on submit and shows the reason under it; typing
 * clears it.
 */
export function useFieldError() {
  const [error, setError] = useState<string | null>(null);
  // A field of two values, a day and a time, hears both refused at once:
  // the first one's message stands until the submit is over.
  const answered = useRef(false);
  return {
    error,
    onInvalid: (event: FormEvent) => {
      const message = refuse(event);
      if (answered.current) return;
      answered.current = true;
      setTimeout(() => {
        answered.current = false;
      });
      setError(message);
    },
    onInput: (event: FormEvent) => {
      cleared(event);
      setError(null);
    },
  };
}

/**
 * The messages of a whole form, by the `name` of each control, for a form
 * whose fields are laid out by hand: put the handlers on the `<form>` and
 * show `errors[name]` under each control.
 */
export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  return {
    errors,
    formProps: {
      onInvalid: (event: FormEvent<HTMLFormElement>) => {
        const message = refuse(event);
        const name = (event.target as HTMLInputElement).name;
        if (message && name) {
          setErrors((all) => (all[name] ? all : { ...all, [name]: message }));
        }
      },
      onInput: (event: FormEvent<HTMLFormElement>) => {
        const name = (cleared(event) as HTMLInputElement).name;
        if (name) {
          setErrors((all) => {
            if (!all[name]) return all;
            const rest = { ...all };
            delete rest[name];
            return rest;
          });
        }
      },
    },
  };
}
