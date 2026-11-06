"use client";

import {
  formatBookingNumber,
  formatInvoiceNumber,
  type InvoicePreview,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { CheckIcon, PencilIcon, XIcon } from "@repo/ui/icons";
import { useEffect, useRef, useState } from "react";
import { OLD_INVOICE_FIELD } from "../_lib/trip-form";

const PREFIX = "HTI-";

/** An invoice number's digits, as the box shows them after its "HTI-": "1313". */
function digitsOf(number: number) {
  return formatBookingNumber("invoice", number).slice(PREFIX.length);
}

/** "1st", "2nd", "3rd", "6th", "11th". */
function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

/** What checking a typed number answers: the invoice with it, or why the check failed. */
export type InvoiceCheck = InvoicePreview | { error: string };

/** The sentence under the box for the invoice shown. */
function invoiceLine(one: InvoicePreview) {
  const number = formatInvoiceNumber(one.number, null);
  const agentInvoice =
    one.agent && one.period
      ? `${one.agent}'s invoice for ${one.period.label}`
      : null;
  if (one.joins) {
    return `${agentInvoice} is ${number}. This booking is its ${ordinal(one.line ?? 1)}.`;
  }
  return agentInvoice
    ? `${number} opens ${agentInvoice}.`
    : `${number} is this booking's invoice number.`;
}

/**
 * The booking's invoice number, beside its button: the invoice it will
 * get, shown before it is made and locked, "HTI-" outside the box and an
 * agent's line after it. An agent's booking joins the agent's invoice for
 * the period of its first trip, and says so; then the number cannot
 * change. Otherwise the pencil opens the box for an old invoice's number,
 * typed as its digits (1200); the tick checks it as the save would, and
 * locks it once it may be used; emptied, the cross goes back to the next
 * number. A refusal shows under the box and leaves the focus where it is.
 * The save checks again, since a booking made meanwhile may take the next
 * number first. Posts the typed number as `OLD_INVOICE_FIELD`, nothing
 * for the next one.
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
  // The old number checked and taken: the invoice it gives.
  const [taken, setTaken] = useState<InvoicePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  // The digits as typed, set as they change: an answer for others is dropped.
  const latest = useRef("");
  const canChange = preview !== null && !preview.joins;
  const changing = editing && canChange;
  const typed = canChange && digits !== "" && (editing || taken !== null);

  function checkDigits(value: string) {
    setChecking(true);
    void check(value).then((answer) => settle(value, answer));
  }
  /** Takes the number checked, or shows why not, the box open to change it. */
  function settle(value: string, answer: InvoiceCheck) {
    if (value !== latest.current) return;
    setChecking(false);
    const refusal = "error" in answer ? answer.error : answer.refusal;
    if (refusal) {
      setTaken(null);
      setError(refusal);
      setEditing(true);
    } else if (!("error" in answer)) {
      setTaken(answer);
      setError(null);
      setEditing(false);
    }
  }

  // The agent or the first trip's period changed: an old number taken is
  // checked again for the invoice it now opens.
  useEffect(() => {
    if (taken && canChange) {
      void check(digits).then((answer) => settle(digits, answer));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on a new preview only
  }, [preview]);

  const shown = typed && !changing && taken ? taken : preview;
  const hint = !preview
    ? waiting
    : changing
      ? (error ??
        `Type the old invoice number to replace ${formatInvoiceNumber(preview.number, null)}.`)
      : invoiceLine(shown!);

  let button;
  if (!changing) {
    button = (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Change the invoice number"
        title="Change the invoice number"
        disabled={!canChange}
        onClick={() => {
          setEditing(true);
          requestAnimationFrame(() => box.current?.focus());
        }}
      >
        <PencilIcon className="size-4" />
      </Button>
    );
  } else if (digits === "") {
    button = (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Use the next number"
        title="Use the next number"
        onClick={() => {
          setEditing(false);
          setTaken(null);
          setError(null);
        }}
      >
        <XIcon className="size-4" />
      </Button>
    );
  } else {
    button = (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Check the number"
        title="Check the number"
        pending={checking}
        onClick={() => checkDigits(digits)}
      >
        <CheckIcon className="size-4" />
      </Button>
    );
  }

  const addon =
    "flex items-center border border-edge bg-shade px-3 text-sm text-muted";
  const line = shown?.line ?? null;
  return (
    <Field
      label="Invoice number"
      hint={
        changing && error ? (
          <span role="alert" className="text-danger">
            {hint}
          </span>
        ) : (
          hint
        )
      }
      className={className}
    >
      <span className="flex gap-2">
        <span className="flex min-w-0 flex-1">
          <span aria-hidden className={`${addon} rounded-l-control border-r-0`}>
            {PREFIX}
          </span>
          {changing ? (
            <Input
              key="typed"
              ref={box}
              aria-label="Old invoice number, its digits"
              aria-invalid={error ? true : undefined}
              inputMode="numeric"
              maxLength={7}
              placeholder={digitsOf(preview!.number)}
              autoComplete="off"
              value={digits}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "");
                latest.current = value;
                setDigits(value);
                setChecking(false);
                setError(null);
                setTaken(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && digits) checkDigits(digits);
              }}
              className={line !== null ? "rounded-none" : "rounded-l-none"}
            />
          ) : (
            <Input
              key="locked"
              readOnly
              aria-label="Invoice number, its digits"
              value={shown ? digitsOf(shown.number) : ""}
              placeholder="····"
              className={`${line !== null ? "rounded-none" : "rounded-l-none"} bg-shade text-muted`}
            />
          )}
          {line !== null ? (
            <span
              aria-hidden
              className={`${addon} rounded-r-control border-l-0`}
            >
              -{String(line).padStart(2, "0")}
            </span>
          ) : null}
        </span>
        {button}
      </span>
      {typed ? (
        <input type="hidden" name={OLD_INVOICE_FIELD} value={digits} />
      ) : null}
    </Field>
  );
}
