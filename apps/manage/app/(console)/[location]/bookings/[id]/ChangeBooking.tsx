"use client";

import {
  CHARGE_REVISION_KINDS,
  formatMyr,
  MAX_STOP_WAIT_MINUTES,
  parseRinggit,
  PRICE_OVERRIDE_FIELDS,
  PRICE_OVERRIDE_REASON_MAX_LENGTH,
  ringgitInputValue,
  type ChargeRevisionKind,
  type PriceRevisionKind,
} from "@repo/db";
import { useActionForm } from "@repo/console/use-action-form";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { Field, Input, Radio, Textarea, inputClassName } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { ChevronDownIcon } from "@repo/ui/icons";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@repo/ui/menu";
import { Notice } from "@repo/ui/notice";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  addChargeAction,
  addStopAction,
  billingPreviewAction,
  cancelBookingAction,
  cancelItemAction,
  priceItemAction,
  quoteStopAction,
  type StopQuoteAnswer,
} from "./actions";

/** One trip as the menu offers it. */
export type ChangeTrip = {
  id: string;
  position: number;
  /** "KLIA to Kuah Town". */
  headline: string;
  /** What it charges now. */
  priceSen: number;
  /** Its stops, by name, in order. */
  stops: string[];
  /** The amend form, when it may be amended. */
  amendHref: string | null;
  /** Not done or cancelled: it takes a stop and a cancel. */
  open: boolean;
  /** Not cancelled: its price may change. */
  live: boolean;
};

/** What the admin may do from the menu. */
export type ChangeRights = {
  /** Amend, add a trip, cancel, the legacy number: `bookings.manage`. */
  manage: boolean;
  /** A discount or a correction: `bookings.create`. */
  price: boolean;
  /** A stop or a charge: `bookings.manage` or `bookings.fulfil`. */
  extras: boolean;
};

type Open =
  | { kind: "stop"; trip: ChangeTrip }
  | { kind: "price"; trip: ChangeTrip; price: PriceRevisionKind }
  | { kind: "cancel-trip"; trip: ChangeTrip }
  | { kind: "charge"; trip: ChangeTrip | null }
  | { kind: "cancel-booking" };

const CHARGE_KIND_TEXT: Record<
  ChargeRevisionKind,
  { label: string; hint: string }
> = {
  "add-on": {
    label: "Add-on",
    hint: "Something more, before or during the trip: an extra hour, a child seat.",
  },
  "late-charge": {
    label: "Late charge",
    hint: "Found after the trip: toll, parking, overtime.",
  },
};

/**
 * "Change booking" in the booking's header: every change to what we
 * deliver or charge, each a revision: amend a trip, add a trip, a stop or
 * a charge, a discount or a correction, cancel a trip or the booking.
 * Each dialog says what saving bills before it is saved, as the invoice
 * preview did. Nothing for an admin who may do none of them.
 */
export function ChangeBookingMenu({
  bookingId,
  label,
  chargedSen,
  keptOnCancelSen,
  trips,
  addTripHref,
  rights,
  cancellable,
}: {
  bookingId: string;
  /** "HTB-0042". */
  label: string;
  /** What the booking charges now. */
  chargedSen: number;
  /** What it would still charge cancelled: its completed trips and its charges. */
  keptOnCancelSen: number;
  trips: readonly ChangeTrip[];
  addTripHref: string | null;
  rights: ChangeRights;
  /** Not cancelled or completed. */
  cancellable: boolean;
}) {
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);
  const tripRows = trips.filter((t) => t.live);
  const any =
    addTripHref !== null ||
    rights.extras ||
    (rights.manage && cancellable) ||
    tripRows.some((t) => t.amendHref || (rights.price && t.live));
  if (!any) return null;

  return (
    <>
      <Menu
        label="Change booking"
        align="end"
        trigger={
          <Button variant="primary">
            Change booking
            <ChevronDownIcon className="size-4" />
          </Button>
        }
      >
        {tripRows.map((trip) => (
          <div key={trip.id} role="group" aria-label={`Trip ${trip.position}`}>
            <MenuLabel>
              Trip {trip.position} · {trip.headline}
            </MenuLabel>
            {trip.amendHref ? (
              <MenuItem asChild>
                <Link href={trip.amendHref}>Amend trip</Link>
              </MenuItem>
            ) : null}
            {rights.extras && trip.open ? (
              <MenuItem onSelect={() => setOpen({ kind: "stop", trip })}>
                Add stop
              </MenuItem>
            ) : null}
            {rights.extras ? (
              <MenuItem onSelect={() => setOpen({ kind: "charge", trip })}>
                Add charge
              </MenuItem>
            ) : null}
            {rights.price ? (
              <>
                <MenuItem
                  onSelect={() =>
                    setOpen({ kind: "price", trip, price: "discount" })
                  }
                >
                  Discount
                </MenuItem>
                <MenuItem
                  onSelect={() =>
                    setOpen({ kind: "price", trip, price: "correction" })
                  }
                >
                  Correct the price
                </MenuItem>
              </>
            ) : null}
            {rights.manage && trip.open && tripRows.length > 1 ? (
              <MenuItem
                className="text-danger"
                onSelect={() => setOpen({ kind: "cancel-trip", trip })}
              >
                Cancel trip
              </MenuItem>
            ) : null}
            <MenuSeparator />
          </div>
        ))}
        {addTripHref ? (
          <MenuItem asChild>
            <Link href={addTripHref}>Add trip</Link>
          </MenuItem>
        ) : null}
        {rights.extras ? (
          <MenuItem onSelect={() => setOpen({ kind: "charge", trip: null })}>
            Add charge to the booking
          </MenuItem>
        ) : null}
        {rights.manage && cancellable ? (
          <MenuItem
            className="text-danger"
            onSelect={() => setOpen({ kind: "cancel-booking" })}
          >
            Cancel booking
          </MenuItem>
        ) : null}
      </Menu>

      {open?.kind === "stop" ? (
        <StopDialog
          bookingId={bookingId}
          chargedSen={chargedSen}
          trip={open.trip}
          onClose={close}
        />
      ) : null}
      {open?.kind === "price" ? (
        <PriceDialog
          bookingId={bookingId}
          chargedSen={chargedSen}
          trip={open.trip}
          kind={open.price}
          onClose={close}
        />
      ) : null}
      {open?.kind === "charge" ? (
        <ChargeDialog
          bookingId={bookingId}
          chargedSen={chargedSen}
          trips={tripRows}
          trip={open.trip}
          onClose={close}
        />
      ) : null}
      {open?.kind === "cancel-trip" ? (
        <CancelDialog
          bookingId={bookingId}
          title={`Cancel trip ${open.trip.position}?`}
          hidden={{ itemId: open.trip.id }}
          action={cancelItemAction}
          remainingSen={chargedSen - open.trip.priceSen}
          done={`Trip ${open.trip.position} cancelled.`}
          onClose={close}
        />
      ) : null}
      {open?.kind === "cancel-booking" ? (
        <CancelDialog
          bookingId={bookingId}
          title={`Cancel booking ${label}?`}
          hidden={{ bookingId }}
          action={cancelBookingAction}
          remainingSen={keptOnCancelSen}
          done={`Booking ${label} cancelled.`}
          onClose={close}
        />
      ) : null}
    </>
  );
}

/**
 * What saving would bill at a new total, asked as the amounts change and
 * shown under the fields: "Saving issues HTI-0013 for RM 90.00." Null
 * while there is no total to ask about, or the answer is on its way.
 */
function useBillingPreview(bookingId: string, chargedSen: number | null) {
  const [answer, setAnswer] = useState<{
    for: number;
    sentence: string;
  } | null>(null);
  useEffect(() => {
    if (chargedSen === null || chargedSen < 0) return;
    let live = true;
    const timer = setTimeout(async () => {
      const result = await answerOf(
        billingPreviewAction(bookingId, chargedSen),
      );
      if (live && "sentence" in result)
        setAnswer({ for: chargedSen, sentence: result.sentence });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [bookingId, chargedSen]);
  return chargedSen !== null && answer?.for === chargedSen
    ? answer.sentence
    : null;
}

/** The new total and what saving bills, under a dialog's fields. */
function BillingLine({
  bookingId,
  chargedSen,
}: {
  bookingId: string;
  chargedSen: number | null;
}) {
  const sentence = useBillingPreview(bookingId, chargedSen);
  if (chargedSen === null) return null;
  return (
    <Notice tone="info">
      <span className="block font-semibold">
        New total {formatMyr(chargedSen)}
      </span>
      <span className="block">
        {sentence ?? "Working out what saving bills…"}
      </span>
    </Notice>
  );
}

/** A dialog holding one change's form, closing once it is saved. */
function ChangeDialog({
  title,
  description,
  action,
  done,
  submit,
  danger = false,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  action: Parameters<typeof useActionForm>[0];
  done: string;
  submit: string;
  danger?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { pending, error, formProps } = useActionForm(action, {
    done,
    onDone: onClose,
  });
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
      title={title}
      description={description}
      width="md"
    >
      <form {...formProps} className="grid gap-4">
        {children}
        <FormError error={error} />
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={danger ? "danger" : "primary"}
            pending={pending}
          >
            {pending ? "Saving…" : submit}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** An amount typed in RM as sen, or null while it is not one. */
const senOf = (typed: string) =>
  typed.trim() === "" ? null : parseRinggit(typed);

/** Discount or Correct the price: the trip's new price with why, or its quote back. */
function PriceDialog({
  bookingId,
  chargedSen,
  trip,
  kind,
  onClose,
}: {
  bookingId: string;
  chargedSen: number;
  trip: ChangeTrip;
  kind: PriceRevisionKind;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(ringgitInputValue(trip.priceSen));
  const price = senOf(amount);
  return (
    <ChangeDialog
      title={
        kind === "discount"
          ? `Discount on trip ${trip.position}`
          : `Correct the price of trip ${trip.position}`
      }
      description={
        kind === "discount"
          ? "A lower price agreed with the customer. The customer sees the change, never the reason."
          : "Our own mistake put right. The customer sees the change, never the reason."
      }
      action={priceItemAction}
      done="Price saved."
      submit="Save price"
      onClose={onClose}
    >
      <input type="hidden" name="itemId" value={trip.id} />
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <Field
          label="Trip's price (RM)"
          hint={`Now ${formatMyr(trip.priceSen)}.`}
        >
          <Input
            name={PRICE_OVERRIDE_FIELDS.amount}
            inputMode="decimal"
            required
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.currentTarget.value)}
          />
        </Field>
        <Field label="Reason" hint="Staff only.">
          <Input
            name={PRICE_OVERRIDE_FIELDS.reason}
            required
            maxLength={PRICE_OVERRIDE_REASON_MAX_LENGTH}
            autoComplete="off"
            placeholder={
              kind === "discount"
                ? "Repeat customer, goodwill"
                : "Charged the wrong class"
            }
          />
        </Field>
      </div>
      <BillingLine
        bookingId={bookingId}
        chargedSen={price === null ? null : chargedSen - trip.priceSen + price}
      />
    </ChangeDialog>
  );
}

/** Add charge: an add-on or a late charge, for a trip or the booking, with the driver's share. */
function ChargeDialog({
  bookingId,
  chargedSen,
  trips,
  trip,
  onClose,
}: {
  bookingId: string;
  chargedSen: number;
  trips: readonly ChangeTrip[];
  trip: ChangeTrip | null;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ChargeRevisionKind>("add-on");
  const [itemId, setItemId] = useState(trip?.id ?? "");
  const [amount, setAmount] = useState("");
  const charge = senOf(amount);
  return (
    <ChangeDialog
      title={trip ? `Add a charge to trip ${trip.position}` : "Add a charge"}
      description="The customer sees what it is for and the amount."
      action={addChargeAction}
      done="Charge added."
      submit="Add charge"
      onClose={onClose}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="itemId" value={itemId} />
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Kind</legend>
        {CHARGE_REVISION_KINDS.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-start gap-2.5 rounded-control border border-edge p-3 text-sm has-checked:border-brand has-checked:bg-brand-tint"
          >
            <Radio
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => setKind(value)}
              className="mt-0.5"
            />
            <span className="grid gap-0.5">
              <span className="font-semibold text-ink">
                {CHARGE_KIND_TEXT[value].label}
              </span>
              <span className="text-caption text-muted">
                {CHARGE_KIND_TEXT[value].hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {trips.length > 1 || !trip ? (
        <Field label="For">
          <Select
            value={itemId}
            onValueChange={setItemId}
            options={[
              { value: "", label: "The whole booking" },
              ...trips.map((t) => ({
                value: t.id,
                label: `Trip ${t.position} · ${t.headline}`,
              })),
            ]}
          />
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="What it is for" hint="The customer reads this.">
          <Input
            name="label"
            required
            maxLength={80}
            autoComplete="off"
            placeholder="Parking at KLIA"
          />
        </Field>
        <Field label="Amount (RM)">
          <Input
            name="amount"
            inputMode="decimal"
            required
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.currentTarget.value)}
          />
        </Field>
      </div>
      {itemId ? (
        <Field
          label="Driver's pay for it (RM)"
          hint="Paid back or earned by the trip's driver: the toll they paid, their overtime. 0 for none."
          className="max-w-64"
        >
          <Input
            name="driverPay"
            inputMode="decimal"
            autoComplete="off"
            defaultValue="0"
          />
        </Field>
      ) : null}
      <Field label="Note" hint="Optional. Staff only.">
        <Input name="reason" maxLength={200} autoComplete="off" />
      </Field>
      <BillingLine
        bookingId={bookingId}
        chargedSen={charge === null ? null : chargedSen + charge}
      />
    </ChangeDialog>
  );
}

/** Cancel a trip or the booking, with a fee or none. */
function CancelDialog({
  bookingId,
  title,
  hidden,
  action,
  remainingSen,
  done,
  onClose,
}: {
  bookingId: string;
  title: string;
  hidden: Record<string, string>;
  action: Parameters<typeof useActionForm>[0];
  /** What the booking still charges once it is cancelled, before any fee. */
  remainingSen: number;
  done: string;
  onClose: () => void;
}) {
  const [fee, setFee] = useState("");
  const feeSen = fee.trim() === "" ? 0 : senOf(fee);
  return (
    <ChangeDialog
      title={title}
      description="No email is sent: tell the customer. A fee, when one is kept, is charged and billed."
      action={action}
      done={done}
      submit="Cancel"
      danger
      onClose={onClose}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Fee (RM)" hint="Empty for none.">
          <Input
            name="feeAmount"
            inputMode="decimal"
            autoComplete="off"
            value={fee}
            onChange={(event) => setFee(event.currentTarget.value)}
          />
        </Field>
        <Field label="Reason for the fee" hint="Needed with a fee. Staff only.">
          <Input
            name="reason"
            maxLength={200}
            autoComplete="off"
            required={feeSen !== 0}
          />
        </Field>
      </div>
      <BillingLine
        bookingId={bookingId}
        chargedSen={feeSen === null ? null : remainingSen + feeSen}
      />
    </ChangeDialog>
  );
}

/**
 * Add stop: the place, where it goes among the trip's stops, the wait;
 * then what the legs add to the quote, the trip's new price by the price
 * rule and the driver's stop pay from the location's rates, both for
 * staff to change, with why when they do.
 */
function StopDialog({
  bookingId,
  chargedSen,
  trip,
  onClose,
}: {
  bookingId: string;
  chargedSen: number;
  trip: ChangeTrip;
  onClose: () => void;
}) {
  const ids = useId();
  const [place, setPlace] = useState<{ text: string; id?: string }>({
    text: "",
  });
  const [at, setAt] = useState(String(trip.stops.length));
  const [quote, setQuote] = useState<{
    key: string;
    answer: StopQuoteAnswer;
  } | null>(null);
  const [price, setPrice] = useState("");
  const [pay, setPay] = useState("");
  const key = place.id ? `${place.id}:${at}` : null;

  useEffect(() => {
    if (!key || !place.id) return;
    let live = true;
    void answerOf(quoteStopAction(trip.id, place.id, Number(at))).then(
      (answer) => {
        if (!live) return;
        const reply: StopQuoteAnswer =
          "ok" in answer ? answer : { ok: false, error: answer.error };
        setQuote({ key, answer: reply });
        if (reply.ok) {
          setPrice(ringgitInputValue(reply.suggestedSen));
          setPay(
            reply.paySuggestionSen === null
              ? ""
              : ringgitInputValue(reply.paySuggestionSen),
          );
        }
      },
    );
    return () => {
      live = false;
    };
  }, [key, place.id, at, trip.id]);

  const current = quote && quote.key === key ? quote.answer : null;
  const priceSen = senOf(price);
  const differs =
    current?.ok === true &&
    (priceSen !== current.suggestedSen ||
      (current.paySuggestionSen !== null &&
        senOf(pay) !== current.paySuggestionSen));
  const positions = [
    { value: "0", label: "First, after the pick-up" },
    ...trip.stops.map((stop, index) => ({
      value: String(index + 1),
      label: `After ${stop}`,
    })),
  ];

  return (
    <ChangeDialog
      title={`Add a stop to trip ${trip.position}`}
      description={`Still one trip: ${trip.headline}, by the stop. The vehicle and the driver stay.`}
      action={addStopAction}
      done="Stop added."
      submit="Add stop"
      onClose={onClose}
    >
      <input type="hidden" name="itemId" value={trip.id} />
      <input type="hidden" name="placeId" value={place.id ?? ""} />
      <div className="grid gap-1.5">
        <label
          htmlFor={`${ids}-place`}
          className="text-sm font-medium text-body"
        >
          Stop
        </label>
        <PlaceInput
          id={`${ids}-place`}
          value={place.text}
          placeId={place.id}
          placeholder="Hotel, restaurant or address"
          inline
          className={inputClassName}
          onChange={(text, id) => setPlace({ text, id })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {trip.stops.length > 0 ? (
          <Field label="Where on the way">
            <input type="hidden" name="at" value={at} />
            <Select value={at} onValueChange={setAt} options={positions} />
          </Field>
        ) : (
          <input type="hidden" name="at" value="0" />
        )}
        <Field label="Wait there (minutes)" className="max-w-48">
          <Input
            name="waitMinutes"
            inputMode="numeric"
            autoComplete="off"
            defaultValue="0"
            maxLength={3}
            title={`0 to ${MAX_STOP_WAIT_MINUTES}`}
          />
        </Field>
      </div>

      {!place.id ? (
        <p className="text-sm text-muted">
          Choose the stop to see what it adds.
        </p>
      ) : !current ? (
        <p className="text-sm text-muted">Pricing the legs through the stop…</p>
      ) : !current.ok ? (
        <Notice tone="danger">{current.error}</Notice>
      ) : (
        <>
          <Notice tone={current.quoteError ? "warning" : "info"}>
            {current.quoteError
              ? `${current.quoteError} Enter the trip's price yourself.`
              : `The stop adds ${formatMyr(current.quoteAddSen)} to the quote${
                  current.extraKm !== null
                    ? `, ${current.extraKm.toFixed(1)} km more by road`
                    : ""
                }. Suggested: ${formatMyr(current.suggestedSen)}, now ${formatMyr(current.chargedSen)} plus that.`}
          </Notice>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trip's price with the stop (RM)">
              <Input
                name="chargedAmount"
                inputMode="decimal"
                required
                autoComplete="off"
                value={price}
                onChange={(event) => setPrice(event.currentTarget.value)}
              />
            </Field>
            <Field
              label="Driver's stop pay (RM)"
              hint={
                current.paySuggestionSen === null
                  ? "No pay rates entered for the location: type it."
                  : `Suggested from the location's pay rates: ${formatMyr(current.paySuggestionSen)}.`
              }
            >
              <Input
                name="driverPay"
                inputMode="decimal"
                autoComplete="off"
                value={pay}
                onChange={(event) => setPay(event.currentTarget.value)}
              />
            </Field>
          </div>
          <Field
            label="Reason"
            hint={
              differs
                ? "Needed: the price or the pay differs from the suggestion. Staff only."
                : "Optional. Staff only."
            }
          >
            <Textarea
              name="reason"
              rows={2}
              maxLength={200}
              required={differs}
            />
          </Field>
          <BillingLine
            bookingId={bookingId}
            chargedSen={
              priceSen === null ? null : chargedSen - trip.priceSen + priceSen
            }
          />
        </>
      )}
    </ChangeDialog>
  );
}
