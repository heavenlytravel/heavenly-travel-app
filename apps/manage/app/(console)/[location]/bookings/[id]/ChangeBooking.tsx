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
import { Menu, MenuItem, MenuSeparator } from "@repo/ui/menu";
import { Notice } from "@repo/ui/notice";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import Link from "next/link";
import {
  createContext,
  use,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { BillingLine } from "../_components/BillingLine";
import {
  addChargeAction,
  addStopAction,
  cancelBookingAction,
  cancelItemAction,
  priceItemAction,
  quoteStopAction,
  reinstateAction,
  type StopQuoteAnswer,
} from "./actions";

/** One trip as its menu offers it. */
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

/** What the admin may change. */
export type ChangeRights = {
  /** Amend, add a trip, cancel, reinstate: `bookings.manage`. */
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
  | { kind: "reinstate-trip"; trip: ChangeTrip }
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
    label: "Late Charge",
    hint: "Found after the trip: toll, parking, overtime.",
  },
};

type ChangeContextValue = {
  trips: readonly ChangeTrip[];
  rights: ChangeRights;
  change: (open: Open) => void;
};

const ChangeContext = createContext<ChangeContextValue | null>(null);

function useChange() {
  const value = use(ChangeContext);
  if (!value) throw new Error("A change menu is used outside ChangeBooking.");
  return value;
}

/**
 * Every change to what a booking delivers or charges, each a revision,
 * around the booking's page: a trip's own changes in its card's "Change
 * trip" menu (`TripChangeMenu`), the booking's in its header
 * (`BookingChangeMenu`), each opening its dialog here. Each dialog ends
 * with the total before and after and what saving bills.
 */
export function ChangeBooking({
  bookingId,
  label,
  chargedSen,
  keptOnCancelSen,
  trips,
  rights,
  children,
}: {
  bookingId: string;
  /** "HTB-0042". */
  label: string;
  /** What the booking charges now. */
  chargedSen: number;
  /** What it would still charge cancelled: its completed trips and its charges. */
  keptOnCancelSen: number;
  trips: readonly ChangeTrip[];
  rights: ChangeRights;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);
  const live = trips.filter((t) => t.live);
  return (
    <ChangeContext value={{ trips, rights, change: setOpen }}>
      {children}
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
          trips={live}
          trip={open.trip}
          onClose={close}
        />
      ) : null}
      {open?.kind === "cancel-trip" ? (
        <CancelDialog
          bookingId={bookingId}
          chargedSen={chargedSen}
          title={`Cancel trip ${open.trip.position}?`}
          hidden={{ itemId: open.trip.id }}
          action={cancelItemAction}
          remainingSen={chargedSen - open.trip.priceSen}
          done={`Trip ${open.trip.position} cancelled.`}
          onClose={close}
        />
      ) : null}
      {open?.kind === "reinstate-trip" ? (
        <ReinstateDialog
          title={`Reinstate trip ${open.trip.position}?`}
          hidden={{ itemId: open.trip.id }}
          done={`Trip ${open.trip.position} reinstated.`}
          onClose={close}
        />
      ) : null}
      {open?.kind === "cancel-booking" ? (
        <CancelDialog
          bookingId={bookingId}
          chargedSen={chargedSen}
          title={`Cancel booking ${label}?`}
          hidden={{ bookingId }}
          action={cancelBookingAction}
          remainingSen={keptOnCancelSen}
          done={`Booking ${label} cancelled.`}
          onClose={close}
        />
      ) : null}
    </ChangeContext>
  );
}

/**
 * "Change Trip" on a trip's card: amend it, add a stop or a charge, a
 * discount or a correction, cancel it; or, cancelled, reinstate it.
 * Nothing for an admin who may do none of them.
 */
export function TripChangeMenu({ tripId }: { tripId: string }) {
  const { trips, rights, change } = useChange();
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return null;
  const others = trips.filter((t) => t.live && t.id !== trip.id).length;

  if (!trip.live) {
    if (!rights.manage) return null;
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => change({ kind: "reinstate-trip", trip })}
      >
        Reinstate Trip
      </Button>
    );
  }

  const items: ReactNode[] = [];
  if (trip.amendHref) {
    items.push(
      <MenuItem key="amend" asChild>
        <Link href={trip.amendHref}>Amend Trip</Link>
      </MenuItem>,
    );
  }
  if (rights.extras && trip.open) {
    items.push(
      <MenuItem key="stop" onSelect={() => change({ kind: "stop", trip })}>
        Add Stop
      </MenuItem>,
    );
  }
  if (rights.extras) {
    items.push(
      <MenuItem key="charge" onSelect={() => change({ kind: "charge", trip })}>
        Add Charge
      </MenuItem>,
    );
  }
  if (rights.price) {
    items.push(
      <MenuItem
        key="discount"
        onSelect={() => change({ kind: "price", trip, price: "discount" })}
      >
        Discount
      </MenuItem>,
      <MenuItem
        key="correction"
        onSelect={() => change({ kind: "price", trip, price: "correction" })}
      >
        Correct the Price
      </MenuItem>,
    );
  }
  // The booking's last live trip goes with the booking: Cancel booking.
  const cancel = rights.manage && trip.open && others > 0;
  if (items.length === 0 && !cancel) return null;

  return (
    <Menu
      label={`Change Trip ${trip.position}`}
      align="end"
      trigger={
        <Button size="sm" variant="secondary">
          Change Trip
          <ChevronDownIcon className="size-4" />
        </Button>
      }
    >
      {items}
      {cancel ? (
        <>
          {items.length > 0 ? <MenuSeparator /> : null}
          <MenuItem
            className="text-danger"
            onSelect={() => change({ kind: "cancel-trip", trip })}
          >
            Cancel Trip
          </MenuItem>
        </>
      ) : null}
    </Menu>
  );
}

/**
 * "Change Booking" in the booking's header: what belongs to the booking
 * rather than one trip: add a trip, a charge to the whole booking, cancel
 * it. Each trip's own changes are on its card. Nothing for an admin who
 * may do none of them.
 */
export function BookingChangeMenu({
  addTripHref,
  cancellable,
}: {
  addTripHref: string | null;
  /** Not cancelled or completed. */
  cancellable: boolean;
}) {
  const { rights, change } = useChange();
  const cancel = rights.manage && cancellable;
  if (!addTripHref && !rights.extras && !cancel) return null;
  return (
    <Menu
      label="Change Booking"
      align="end"
      trigger={
        <Button variant="primary">
          Change Booking
          <ChevronDownIcon className="size-4" />
        </Button>
      }
    >
      {addTripHref ? (
        <MenuItem asChild>
          <Link href={addTripHref}>Add Trip</Link>
        </MenuItem>
      ) : null}
      {rights.extras ? (
        <MenuItem onSelect={() => change({ kind: "charge", trip: null })}>
          Add Charge to the Booking
        </MenuItem>
      ) : null}
      {cancel ? (
        <>
          {addTripHref || rights.extras ? <MenuSeparator /> : null}
          <MenuItem
            className="text-danger"
            onSelect={() => change({ kind: "cancel-booking" })}
          >
            Cancel Booking
          </MenuItem>
        </>
      ) : null}
    </Menu>
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
      submit="Save Price"
      onClose={onClose}
    >
      <input type="hidden" name="itemId" value={trip.id} />
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <Field
          label="Trip's Price (RM)"
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
        nowSen={chargedSen}
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
      title={trip ? `Add a Charge to Trip ${trip.position}` : "Add a Charge"}
      description="The customer sees what it is for and the amount."
      action={addChargeAction}
      done="Charge added."
      submit="Add Charge"
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
              { value: "", label: "The Whole Booking" },
              ...trips.map((t) => ({
                value: t.id,
                label: `Trip ${t.position} · ${t.headline}`,
              })),
            ]}
          />
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="What It Is For" hint="The customer reads this.">
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
          label="Driver's Pay for It (RM)"
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
        nowSen={chargedSen}
        chargedSen={charge === null ? null : chargedSen + charge}
      />
    </ChangeDialog>
  );
}

/** Cancel a trip or the booking, with a fee or none. */
function CancelDialog({
  bookingId,
  chargedSen,
  title,
  hidden,
  action,
  remainingSen,
  done,
  onClose,
}: {
  bookingId: string;
  /** What the booking charges now. */
  chargedSen: number;
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
        <Field label="Reason for the Fee" hint="Needed with a fee. Staff only.">
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
        nowSen={chargedSen}
        chargedSen={feeSen === null ? null : remainingSen + feeSen}
      />
    </ChangeDialog>
  );
}

/**
 * Reinstate: a cancelled trip, or the booking with the trips cancelled
 * with it, back as they were before, the cancellation fee taken off.
 */
function ReinstateDialog({
  title,
  hidden,
  done,
  onClose,
}: {
  title: string;
  hidden: Record<string, string>;
  done: string;
  onClose: () => void;
}) {
  return (
    <ChangeDialog
      title={title}
      description="It goes back to confirmed, or received if it never was, with no vehicle or driver: assign it again. Its cancellation fee is taken off. No email is sent: tell the customer."
      action={reinstateAction}
      done={done}
      submit="Reinstate"
      onClose={onClose}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Notice tone="info">
        Billing follows: what it charges again goes on its open invoice. A
        credit note issued for the cancel stays as it is.
      </Notice>
    </ChangeDialog>
  );
}

/** Reinstate booking, in a cancelled booking's header. */
export function ReinstateBookingButton({
  bookingId,
  label,
}: {
  bookingId: string;
  /** "HTB-0042". */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Reinstate Booking
      </Button>
      {open ? (
        <ReinstateDialog
          title={`Reinstate booking ${label}?`}
          hidden={{ bookingId }}
          done={`Booking ${label} reinstated.`}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
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
    { value: "0", label: "First, After the Pick-up" },
    ...trip.stops.map((stop, index) => ({
      value: String(index + 1),
      label: `After ${stop}`,
    })),
  ];

  return (
    <ChangeDialog
      title={`Add a Stop to Trip ${trip.position}`}
      description={`Still one trip: ${trip.headline}, by the stop. The vehicle and the driver stay.`}
      action={addStopAction}
      done="Stop added."
      submit="Add Stop"
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
          <Field label="Where on the Way">
            <input type="hidden" name="at" value={at} />
            <Select value={at} onValueChange={setAt} options={positions} />
          </Field>
        ) : (
          <input type="hidden" name="at" value="0" />
        )}
        <Field label="Wait There (minutes)" className="max-w-48">
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
            <Field label="Trip's Price with the Stop (RM)">
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
              label="Driver's Stop Pay (RM)"
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
            nowSen={chargedSen}
            chargedSen={
              priceSen === null ? null : chargedSen - trip.priceSen + priceSen
            }
          />
        </>
      )}
    </ChangeDialog>
  );
}
