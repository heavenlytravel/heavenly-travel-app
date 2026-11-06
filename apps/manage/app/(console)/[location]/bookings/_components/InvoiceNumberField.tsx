"use client";

import {
  formatBookingNumber,
  formatInvoiceNumber,
  type InvoicePreview,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { showFieldError } from "@repo/ui/validation";
import { useEffect, useRef, useState } from "react";
import { OLD_INVOICE_FIELD } from "../_lib/trip-form";

const PREFIX = "HTI-";

/** An invoice number's digits, as the box shows them after its "HTI-": "1313". */
function digitsOf(number: number) {
  return formatBookingNumber("invoice", number).slice(PREFIX.length);
}

/** What checking a typed number answers: the invoice with it, or why the check failed. */
export type InvoiceCheck = InvoicePreview | { error: string };

/**
 * The booking's invoice number, beside its button: the invoice it will
 * get, shown before it is made and locked, with "HTI-" outside the box.
 * An agent's booking joins the agent's invoice for the period of its first
 * trip, and says so; then the number cannot change. Otherwise "Change"
 * opens the box for an old invoice's number, typed as its digits (1200)
 * and checked as the box is left, as the save checks it; "Cancel" goes
 * back to the next number. The save checks again, since a booking made
 * meanwhile may take the next number first. Posts the typed number as
 * `OLD_INVOICE_FIELD`, nothing while locked.
 */
export function InvoiceNumberField({
  preview,
  waiting,
  check,
  className,
}: {
  /** The invoice as it stands; null until it can be known, `waiting` saying why. */
  preview: InvoicePreview | null;
  waiting: string;
  /** Checks a typed number, its digits, for this booking. */
  check: (digits: string) => Promise<InvoiceCheck>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [digits, setDigits] = useState("");
  // The answer for the digits typed, once checked: which invoice they give.
  const [typed, setTyped] = useState<{
    digits: string;
    preview: InvoicePreview;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const canChange = preview !== null && !preview.joins;
  const changing = editing && canChange;

  async function checkTyped(value: string) {
    if (!value) return;
    const answer = await check(value);
    // Typed on meanwhile: that is checked on its own.
    if (input.current?.value !== value) return;
    const error = "error" in answer ? answer.error : answer.refusal;
    if (error) {
      setTyped(null);
      showFieldError(input.current.form, OLD_INVOICE_FIELD, error);
    } else if (!("error" in answer)) {
      setTyped({ digits: value, preview: answer });
    }
  }

  // The agent or the first trip's period changed: the number typed is
  // checked again for the invoice it now opens.
  useEffect(() => {
    if (changing && input.current?.value) void checkTyped(input.current.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on a new preview only
  }, [preview]);

  const next = preview ? formatInvoiceNumber(preview.number, null) : null;
  const invoiceOf = (one: InvoicePreview) =>
    one.agent && one.period
      ? `${one.agent}'s invoice for ${one.period.label}`
      : null;

  let hint: string;
  if (!preview) {
    hint = waiting;
  } else if (preview.joins) {
    hint = `Joins ${invoiceOf(preview)} as line ${preview.line}. Its number is set.`;
  } else if (!changing) {
    const opens = invoiceOf(preview);
    hint = `${opens ? `Opens ${opens}. ` : ""}The next number, unless another booking is made first.`;
  } else if (typed && typed.digits === digits) {
    const opens = invoiceOf(typed.preview);
    const number = formatInvoiceNumber(typed.preview.number, null);
    hint = opens
      ? `Opens ${opens} as ${number}, an old invoice's number.`
      : `${number}, an old invoice's number, is free to use.`;
  } else {
    hint = `Type the old invoice's number. Cancel for ${next}.`;
  }

  return (
    <Field label="Invoice number" hint={hint} className={className}>
      <span className="flex gap-2">
        <span className="flex min-w-0 flex-1">
          <span
            aria-hidden
            className="flex items-center rounded-l-control border border-r-0 border-edge bg-shade px-3 text-sm text-muted"
          >
            {PREFIX}
          </span>
          {changing ? (
            <Input
              key="typed"
              ref={input}
              name={OLD_INVOICE_FIELD}
              aria-label="Old invoice number, its digits"
              inputMode="numeric"
              maxLength={7}
              placeholder={preview ? digitsOf(preview.number) : undefined}
              autoComplete="off"
              autoFocus
              value={digits}
              onChange={(event) => {
                setDigits(event.target.value.replace(/\D/g, ""));
              }}
              onBlur={(event) => void checkTyped(event.target.value)}
              className="rounded-l-none"
            />
          ) : (
            <Input
              key="locked"
              readOnly
              aria-label="Invoice number, its digits"
              value={preview ? digitsOf(preview.number) : ""}
              placeholder="····"
              className="rounded-l-none bg-shade text-muted"
            />
          )}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={!canChange}
          onClick={() => {
            setEditing(!changing);
            setDigits("");
            setTyped(null);
          }}
        >
          {changing ? "Cancel" : "Change"}
        </Button>
      </span>
    </Field>
  );
}
