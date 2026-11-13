"use client";

import {
  formatMyr,
  parseRinggit,
  PRICE_OVERRIDE_REASON_MAX_LENGTH,
  ringgitInputValue,
} from "@repo/db";
import { Card, CardTitle } from "@repo/console/Card";
import { CancelLink } from "@repo/console/FormFoot";
import { FormError } from "@repo/ui/form-error";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/field";
import { Fragment, useId, useState, type ReactNode } from "react";
import { Choices } from "../../../../_components/Choices";
import type { PriceLine } from "../_lib/trip-form";

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
  /** Under its name: where it goes, when, and in what. */
  detail?: ReactNode;
  /** What its quote in the vehicle chosen is made of (`tripPriceLines`); empty before one is. */
  lines: readonly PriceLine[];
};

/**
 * The column beside a booking form's steps: what has been entered so far,
 * then each trip, its price and what the price is made of, the total and
 * the form's button, in view on every step. A trip's price is the quote
 * for the vehicle chosen, a line for each charge in it; "Agree a different
 * price" opens the agreed price under it, with its reason, and the trip's
 * price and the total follow it. The quote stays on the receipt next to
 * the agreed price.
 */
export function BookingSummary({
  meta,
  rows = [],
  trips,
  onPriceChange,
  canPrice,
  priceNote,
  submit,
  missing,
  error,
  cancelHref,
}: {
  /** Beside the title: the locations whose rates price the trips. */
  meta?: string;
  /** What was entered besides the trips, a label and a line each: the customer. */
  rows?: readonly { label: string; value: ReactNode }[];
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
}) {
  const charged = trips.map((trip) => {
    const agreed = canPrice ? parseRinggit(trip.agreedPrice) : null;
    const quotedSen =
      trip.lines.length > 0
        ? trip.lines.reduce((sum, line) => sum + line.amountSen, 0)
        : null;
    return {
      trip,
      quotedSen,
      agreed,
      total: quotedSen === null ? null : (agreed ?? quotedSen),
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
        <div className="grid divide-y divide-hairline text-sm *:py-4 *:first:pt-0">
          {rows.length > 0 ? (
            <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-3">
              {rows.map((row) => (
                <Fragment key={row.label}>
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-body">{row.value}</dd>
                </Fragment>
              ))}
            </dl>
          ) : null}
          {charged.map(({ trip, quotedSen, agreed, total: charge }) => (
            <section
              key={trip.id}
              aria-label={trip.label ?? "Trip"}
              className="grid gap-2.5"
            >
              <div className="grid gap-0.5">
                <div className="flex items-baseline justify-between gap-4 font-semibold text-ink">
                  <h3>{trip.label ?? "Trip"}</h3>
                  <span className="tabular-nums">
                    {charge !== null ? formatMyr(charge) : "—"}
                  </span>
                </div>
                {trip.detail ? (
                  <div className="text-xs text-muted">{trip.detail}</div>
                ) : null}
              </div>
              {trip.lines.length > 0 ? (
                <PriceLines
                  lines={trip.lines}
                  quotedSen={agreed !== null ? quotedSen : null}
                />
              ) : null}
              {agreed !== null ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 text-body">
                    Agreed Price
                    {trip.priceReason ? (
                      <span className="block text-xs text-muted">
                        {trip.priceReason}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-ink tabular-nums">
                    {formatMyr(agreed)}
                  </span>
                </div>
              ) : null}
              {canPrice && quotedSen !== null ? (
                <AgreedPrice
                  values={trip}
                  onChange={(patch) => onPriceChange(trip.id, patch)}
                  quotedSen={quotedSen}
                  name={trip.label}
                  note={priceNote}
                />
              ) : null}
            </section>
          ))}
          <div className="flex items-baseline justify-between gap-4 text-base font-bold text-ink">
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
          <CancelLink href={cancelHref} className="justify-self-center" />
        </div>
      </div>
    </Card>
  );
}

/**
 * What a trip's quote is made of, on a tint: a line for each charge, with
 * its word under it, then the quote, when an agreed price stands in for it
 * (`quotedSen`).
 */
function PriceLines({
  lines,
  quotedSen,
}: {
  lines: readonly PriceLine[];
  quotedSen: number | null;
}) {
  return (
    <dl className="grid gap-1.5 rounded-control bg-mist px-3 py-2.5 text-xs">
      {lines.map((line) => (
        <div
          key={line.label}
          className="flex items-baseline justify-between gap-4"
        >
          <dt className="min-w-0 text-body">
            {line.label}
            {line.note ? (
              <span className="block text-muted">{line.note}</span>
            ) : null}
          </dt>
          <dd className="shrink-0 text-body tabular-nums">
            {formatMyr(line.amountSen)}
          </dd>
        </div>
      ))}
      {quotedSen !== null ? (
        <div className="mt-0.5 flex items-baseline justify-between gap-4 border-t border-hairline pt-1.5 font-semibold text-ink">
          <dt>Quote</dt>
          <dd className="tabular-nums">{formatMyr(quotedSen)}</dd>
        </div>
      ) : null}
    </dl>
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
          className="justify-self-start text-sm text-link"
        >
          {name
            ? `Agree a different price for ${name.toLowerCase()}`
            : "Agree a Different Price"}
        </button>
        {note ? <p className="text-xs text-warning">{note}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-1 mb-1 grid gap-3 rounded-control border border-dashed border-slot p-3">
      <label htmlFor={`${ids}-amount`} className="grid gap-1.5">
        <span className="text-xs font-semibold text-body">
          {name ? `${name}, Agreed Price (RM)` : "Agreed Price (RM)"}
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
