"use client";

import {
  formatMyr,
  parseRinggit,
  PRICE_OVERRIDE_REASON_MAX_LENGTH,
  ringgitInputValue,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/field";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { quotedTotalSen, type ItemDraft } from "../_lib/trip-form";
import { Choices } from "./Choices";

/** The reasons staff give most, one tap each; anything else is typed. */
const REASONS = ["Agreed on the phone", "Goodwill", "Repeat customer"] as const;
const OTHER = "Other";

/**
 * The column beside a booking form's steps: what has been entered so far,
 * the price, and the form's button, in view on every step. The price is
 * the quote for the vehicle chosen; "Agree a different price" opens the
 * agreed price under it, with its reason, and the total follows it. The
 * quote stays on the receipt next to the agreed price.
 */
export function BookingSummary({
  rows,
  draft,
  onChange,
  canPrice,
  priceNote,
  submit,
  missing,
  error,
  cancelHref,
}: {
  /** What was entered, a label and a line each: the customer, the trip, the vehicle. */
  rows: readonly { label: string; value: ReactNode }[];
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  /** Whether an agreed price may be set (`bookings.create`). */
  canPrice: boolean;
  /** Under the agreed price, what saving does to the one in force. */
  priceNote?: string;
  /** The form's submit button. */
  submit: ReactNode;
  /** What is still needed before the button works; null once nothing is. */
  missing: string | null;
  error: string | null;
  cancelHref: string;
}) {
  const quoted = quotedTotalSen(draft);
  const agreed = canPrice ? parseRinggit(draft.agreedPrice) : null;

  return (
    <div className="grid gap-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="text-base font-semibold tracking-tight">Summary</h2>
      <dl className="grid gap-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-neutral-500">{row.label}</dt>
            <dd className="text-neutral-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-1.5 border-t border-neutral-100 pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">Quoted price</span>
          <span className="tabular-nums">
            {quoted !== null ? formatMyr(quoted) : "—"}
          </span>
        </div>
        {agreed !== null ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Agreed price</span>
            <span className="tabular-nums">{formatMyr(agreed)}</span>
          </div>
        ) : null}
        <div className="mt-1 flex justify-between gap-4 border-t border-neutral-100 pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {quoted !== null ? formatMyr(agreed ?? quoted) : "—"}
          </span>
        </div>
        {canPrice && quoted !== null ? (
          <AgreedPrice
            draft={draft}
            onChange={onChange}
            quotedSen={quoted}
            note={priceNote}
          />
        ) : null}
      </div>

      <div className="grid gap-2">
        {submit}
        {error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {error}
          </p>
        ) : missing ? (
          <p className="text-xs text-neutral-500">{missing}</p>
        ) : null}
        <Link
          href={cancelHref}
          className="justify-self-start text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

/**
 * The agreed price, folded under a link until it is wanted: the amount in
 * RM, with the quote as its placeholder, and the reason, one of the usual
 * ones or typed. "Remove" clears both, back to the quote.
 */
function AgreedPrice({
  draft,
  onChange,
  quotedSen,
  note,
}: {
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  quotedSen: number;
  note?: string;
}) {
  const ids = useId();
  const set = draft.agreedPrice !== "" || draft.priceReason !== "";
  const [open, setOpen] = useState(set);
  const usual = (REASONS as readonly string[]).includes(draft.priceReason);
  const [other, setOther] = useState(draft.priceReason !== "" && !usual);
  const choice = other ? OTHER : usual ? draft.priceReason : null;

  if (!open) {
    return (
      <div className="mt-1 grid gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="justify-self-start text-sm font-medium underline-offset-4 hover:underline"
        >
          Agree a different price
        </button>
        {note ? <p className="text-xs text-amber-800">{note}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-3 rounded-lg border border-dashed border-neutral-300 p-3">
      <label htmlFor={`${ids}-amount`} className="grid gap-1.5">
        <span className="text-xs font-medium text-neutral-700">
          Agreed price (RM)
        </span>
        <Input
          id={`${ids}-amount`}
          inputMode="decimal"
          autoComplete="off"
          placeholder={ringgitInputValue(quotedSen)}
          value={draft.agreedPrice}
          onChange={(e) => onChange({ agreedPrice: e.target.value })}
        />
      </label>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-neutral-700">Why</span>
        <Choices
          label="Why the price is agreed"
          size="sm"
          value={choice}
          options={[...REASONS, OTHER].map((reason) => ({
            value: reason,
            label: reason,
          }))}
          onChange={(reason) => {
            if (reason === OTHER) {
              setOther(true);
              if (usual) onChange({ priceReason: "" });
            } else {
              setOther(false);
              onChange({ priceReason: reason });
            }
          }}
        />
        {other ? (
          <Input
            aria-label="The reason"
            maxLength={PRICE_OVERRIDE_REASON_MAX_LENGTH}
            autoComplete="off"
            placeholder="Corporate rate, a complaint put right"
            value={draft.priceReason}
            onChange={(e) => onChange({ priceReason: e.target.value })}
          />
        ) : null}
      </div>
      <p className="text-xs text-neutral-500">
        The quote stays on the receipt.
      </p>
      {note ? <p className="text-xs text-amber-800">{note}</p> : null}
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start"
        onClick={() => {
          onChange({ agreedPrice: "", priceReason: "" });
          setOther(false);
          setOpen(false);
        }}
      >
        Remove
      </Button>
    </div>
  );
}
