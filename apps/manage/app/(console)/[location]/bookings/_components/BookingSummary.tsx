"use client";

import {
  formatMyr,
  parseRinggit,
  PRICE_OVERRIDE_REASON_MAX_LENGTH,
  ringgitInputValue,
} from "@repo/db";
import { Card, CardTitle } from "@repo/console/Card";
import { FormError } from "@repo/console/FormError";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/field";
import Link from "next/link";
import { Fragment, useId, useState, type ReactNode } from "react";
import { Choices } from "../../../../_components/Choices";

/** The reasons staff give most, one tap each; anything else is typed. */
const REASONS = ["Agreed on the phone", "Goodwill", "Repeat customer"] as const;
const OTHER = "Other";

/** What a trip's agreed price is typed as: the amount in RM and the reason. */
type AgreedValues = { agreedPrice: string; priceReason: string };

/** One trip as the summary prices it, with the price agreed for it. */
export type SummaryTrip = AgreedValues & {
  id: string;
  /** "Trip 2"; null for a booking's only trip. */
  label: string | null;
  /** The quote in the vehicle chosen; null before one is. */
  quotedSen: number | null;
};

/**
 * The column beside a booking form's steps: what has been entered so far,
 * each trip's price, the total and the form's button, in view on every
 * step. A trip's price is the quote for the vehicle chosen; "Agree a
 * different price" opens the agreed price under it, with its reason, and
 * the total follows it. The quote stays on the receipt next to the agreed
 * price.
 */
export function BookingSummary({
  meta,
  rows,
  trips,
  onPriceChange,
  canPrice,
  priceNote,
  submit,
  missing,
  error,
  cancelHref,
  foot,
}: {
  /** Beside the title: the locations whose rates price the trips. */
  meta?: string;
  /** What was entered, a label and a line each: the customer, the trips, the vehicle. */
  rows: readonly { label: string; value: ReactNode }[];
  trips: readonly SummaryTrip[];
  onPriceChange: (id: string, patch: Partial<AgreedValues>) => void;
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
  /** A line under it all, on a hairline. */
  foot?: ReactNode;
}) {
  const charged = trips.map((trip) => {
    const agreed = canPrice ? parseRinggit(trip.agreedPrice) : null;
    return {
      trip,
      agreed,
      total: trip.quotedSen === null ? null : (agreed ?? trip.quotedSen),
    };
  });
  const total = charged.every((line) => line.total !== null)
    ? charged.reduce((sum, line) => sum + line.total!, 0)
    : null;

  return (
    <Card flush>
      <CardTitle inset meta={meta}>
        Summary
      </CardTitle>
      <div className="grid gap-5 p-5">
        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
          {rows.map((row) => (
            <Fragment key={row.label}>
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-body">{row.value}</dd>
            </Fragment>
          ))}
        </dl>

        <div className="grid gap-1.5 border-t border-hairline pt-4 text-sm">
          {charged.map(({ trip, agreed }) => (
            <Fragment key={trip.id}>
              <div className="flex justify-between gap-4">
                <span className="text-muted">
                  {trip.label ?? "Quoted price"}
                </span>
                <span className="text-body tabular-nums">
                  {trip.quotedSen !== null ? formatMyr(trip.quotedSen) : "—"}
                </span>
              </div>
              {agreed !== null ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">
                    {trip.label ? `${trip.label}, agreed` : "Agreed price"}
                  </span>
                  <span className="text-body tabular-nums">
                    {formatMyr(agreed)}
                  </span>
                </div>
              ) : null}
              {canPrice && trip.quotedSen !== null ? (
                <AgreedPrice
                  values={trip}
                  onChange={(patch) => onPriceChange(trip.id, patch)}
                  quotedSen={trip.quotedSen}
                  name={trip.label}
                  note={priceNote}
                />
              ) : null}
            </Fragment>
          ))}
          <div className="mt-2 flex justify-between gap-4 border-t border-hairline pt-3 text-base font-bold text-ink">
            <span>Total</span>
            <span className="tabular-nums">
              {total !== null ? formatMyr(total) : "—"}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {submit}
          {error ? (
            <FormError error={error} />
          ) : missing ? (
            <p aria-live="polite" className="text-center text-xs text-muted">
              {missing}
            </p>
          ) : null}
          <Link
            href={cancelHref}
            className="justify-self-center text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Cancel
          </Link>
        </div>
      </div>
      {foot ? (
        <p className="border-t border-hairline px-5 py-3.5 text-xs text-muted">
          {foot}
        </p>
      ) : null}
    </Card>
  );
}

/**
 * The agreed price of one trip, folded under a link until it is wanted:
 * the amount in RM, with the quote as its placeholder, and the reason, one
 * of the usual ones or typed. "Remove" clears both, back to the quote.
 */
function AgreedPrice({
  values,
  onChange,
  quotedSen,
  name,
  note,
}: {
  values: AgreedValues;
  onChange: (patch: Partial<AgreedValues>) => void;
  quotedSen: number;
  /** "Trip 2"; null for a booking's only trip. */
  name: string | null;
  note?: string;
}) {
  const ids = useId();
  const set = values.agreedPrice !== "" || values.priceReason !== "";
  const [open, setOpen] = useState(set);
  const usual = (REASONS as readonly string[]).includes(values.priceReason);
  const [other, setOther] = useState(values.priceReason !== "" && !usual);
  const choice = other ? OTHER : usual ? values.priceReason : null;

  if (!open) {
    return (
      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="justify-self-start text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          {name
            ? `Agree a different price for ${name.toLowerCase()}`
            : "Agree a different price"}
        </button>
        {note ? <p className="text-xs text-warning">{note}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-1 mb-1 grid gap-3 rounded-control border border-dashed border-slot p-3">
      <label htmlFor={`${ids}-amount`} className="grid gap-1.5">
        <span className="text-xs font-semibold text-body">
          {name ? `${name}, agreed price (RM)` : "Agreed price (RM)"}
        </span>
        <Input
          id={`${ids}-amount`}
          inputMode="decimal"
          autoComplete="off"
          placeholder={ringgitInputValue(quotedSen)}
          value={values.agreedPrice}
          onChange={(e) => onChange({ agreedPrice: e.target.value })}
        />
      </label>
      <div className="grid gap-1.5">
        <span className="text-xs font-semibold text-body">Why</span>
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
            value={values.priceReason}
            onChange={(e) => onChange({ priceReason: e.target.value })}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted">The quote stays on the receipt.</p>
      {note ? <p className="text-xs text-warning">{note}</p> : null}
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
