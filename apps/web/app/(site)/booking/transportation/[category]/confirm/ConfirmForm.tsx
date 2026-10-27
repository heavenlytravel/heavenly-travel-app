"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import {
  CONTACT_NAME_MAX_LENGTH,
  formatMyr,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  type TripCategory,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { showFieldError, useFormErrors } from "@repo/ui/validation";
import Link from "next/link";
import type { ForDriver } from "../../../../../_lib/trip-plan";
import {
  control,
  Pending,
  primaryButton,
  textLink,
} from "../../../../_components/Page";
import { createTripsBookingAction, type ConfirmState } from "./actions";
import { CONFIRM_FIELDS } from "./fields";

const listFormat = new Intl.ListFormat("en-GB", { type: "conjunction" });
const label = "mb-1.5 block text-[0.9rem] font-semibold text-slate-800";
const hint = "mt-1.5 block text-[0.85rem] text-slate-500";
const refused = "mt-1.5 block text-[0.85rem] text-[#b3261e]";
/** A field given the focus comes into view clear of the site header and the pinned trips. */
const inView = "scroll-mt-28 scroll-mb-8";

/**
 * "Your details": name, phone and email, the flights when a trip picks up
 * or drops off at an airport, one note for the drivers, then the booking
 * is made. The trips, the vehicle and the prices shown travel in hidden
 * fields (`entries`), so the action prices every trip again from scratch.
 * The flights and the note are the plan's, kept as they are typed;
 * `onForDriver` stores them. Signed in, the email is the account's and
 * cannot be edited here; signed out, a line offers sign-in, which comes
 * back to this page with the plan intact. The contact fields are
 * controlled: React resets a form once its action returns, and an answer
 * that is an error must not wipe what the customer typed. A field refused,
 * by the browser on submit or by the server, says why under itself; any
 * other refusal shows above the button. It is the page's one button,
 * under the details with the total on it. It waits while a trip is marked
 * in red, `blocked` saying which to fix, and while the name, the phone or
 * the email is empty, a line saying which to fill in.
 */
export function ConfirmForm({
  category,
  entries,
  totalSen,
  cancellation,
  blocked,
  forDriver,
  arriving,
  departing,
  onForDriver,
  onDone,
  onRepriced,
  defaultName,
  defaultPhone,
  accountEmail,
  signInHref,
}: {
  category: TripCategory;
  /** The trips, the vehicle and the prices shown, as hidden fields. */
  entries: [name: string, value: string][];
  totalSen: number;
  /** The cancellation terms under the button; null while no vehicle is chosen. */
  cancellation: string | null;
  /** What to fix before booking; null when nothing stops it. */
  blocked: string | null;
  forDriver: ForDriver;
  /** Where the arriving flight is for, when a trip picks up at an airport; null hides the field. */
  arriving: string | null;
  /** Where the departing flight is for, when a trip drops off at an airport; null hides the field. */
  departing: string | null;
  onForDriver: (change: Partial<ForDriver>) => void;
  /** The booking is made: where to go. */
  onDone: (href: string) => void;
  /** A trip changed since it was priced: price them again. */
  onRepriced: () => void;
  defaultName: string;
  defaultPhone: string;
  /** The signed-in customer's email, or null for a visitor. */
  accountEmail: string | null;
  /** Where a visitor signs in; null when signed in. */
  signInHref: string | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ConfirmState, FormData>(
    async (previous, formData) => {
      const answer = await answerOf(
        createTripsBookingAction(previous, formData),
      );
      if (answer === null) return null;
      if ("done" in answer) {
        onDone(answer.done);
        return null;
      }
      if ("repriced" in answer && answer.repriced) onRepriced();
      const atField =
        "field" in answer &&
        answer.field !== undefined &&
        showFieldError(form.current, answer.field, answer.error);
      return atField ? null : answer;
    },
    null,
  );
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(accountEmail ?? "");
  const locked = accountEmail !== null;
  const { errors, formProps } = useFormErrors();
  /** The line under a field: why it was refused, or its hint. */
  const note = (field: string, text?: string) =>
    errors[field] ? (
      <span role="alert" className={refused}>
        {errors[field]}
      </span>
    ) : text ? (
      <span className={hint}>{text}</span>
    ) : null;
  const error = state && "error" in state ? state.error : null;
  const missing = [
    name.trim() === "" ? "name" : null,
    phone.trim() === "" ? "phone number" : null,
    email.trim() === "" ? "email" : null,
  ].filter((field) => field !== null);
  const alert = blocked ?? error;

  return (
    <form ref={form} action={action} {...formProps} className="grid gap-4">
      <input type="hidden" name={CONFIRM_FIELDS.category} value={category} />
      {entries.map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}
      {signInHref && (
        <p className="text-[0.9rem] text-slate-500">
          Have an account?{" "}
          <Link href={signInHref} className={textLink}>
            Sign in
          </Link>
        </p>
      )}
      <Field label="Name for the driver">
        <input
          name={CONFIRM_FIELDS.name}
          required
          maxLength={CONTACT_NAME_MAX_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={`${control} ${inView}`}
        />
        {note(CONFIRM_FIELDS.name)}
      </Field>
      <Field label="Phone number">
        <input
          name={CONFIRM_FIELDS.phone}
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+60 12 345 6789"
          autoComplete="tel"
          className={`${control} ${inView}`}
        />
        {note(
          CONFIRM_FIELDS.phone,
          "Your driver will reach you on WhatsApp or by call.",
        )}
      </Field>
      <Field label="Email">
        <input
          name={CONFIRM_FIELDS.email}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={locked}
          autoComplete="email"
          className={`${control} ${inView} ${locked ? "bg-mist text-slate-700" : ""}`}
        />
        {note(
          CONFIRM_FIELDS.email,
          locked
            ? "From your account. Your booking emails go here."
            : "We need your email to send your booking confirmation.",
        )}
      </Field>
      {arriving !== null ? (
        <Field label="Arriving flight" optional>
          <input
            name={CONFIRM_FIELDS.arrivingFlight}
            value={forDriver.arrivingFlight}
            maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
            onChange={(e) =>
              onForDriver({ arrivingFlight: e.target.value.toUpperCase() })
            }
            placeholder="MH 1234"
            autoComplete="off"
            className={`${control} ${inView} uppercase`}
          />
          <span className={hint}>
            For the pick-up at {arriving}. Your driver follows it, and waits if
            it lands late.
          </span>
        </Field>
      ) : null}
      {departing !== null ? (
        <Field label="Departing flight" optional>
          <input
            name={CONFIRM_FIELDS.departingFlight}
            value={forDriver.departingFlight}
            maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
            onChange={(e) =>
              onForDriver({ departingFlight: e.target.value.toUpperCase() })
            }
            placeholder="AK 6305"
            autoComplete="off"
            className={`${control} ${inView} uppercase`}
          />
          <span className={hint}>
            For the drop-off at {departing}, so your driver leaves time for
            check-in.
          </span>
        </Field>
      ) : null}
      <Field label="Notes for the driver" optional>
        <textarea
          name={CONFIRM_FIELDS.notes}
          value={forDriver.notes}
          maxLength={TRIP_MAX_NOTES_LENGTH}
          onChange={(e) => onForDriver({ notes: e.target.value })}
          rows={3}
          placeholder="Luggage, a child seat, a meeting point, anything we should know"
          className={control}
        />
        <span className={hint}>Every driver on this booking sees it.</span>
      </Field>
      {/* Honeypot: off screen and out of the tab order, so only a bot fills it. */}
      <div
        aria-hidden="true"
        className="absolute top-0 -left-[9999px] h-px w-px overflow-hidden"
      >
        <label>
          Fax
          <input
            name={CONFIRM_FIELDS.honeypot}
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
      <div className="grid gap-3">
        {alert ? (
          <p role="alert" className="text-[0.95rem] text-[#b3261e]">
            {alert}
          </p>
        ) : missing.length > 0 ? (
          <p className="text-[0.95rem] text-slate-600">
            Fill in your {listFormat.format(missing)} to confirm.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || blocked !== null || missing.length > 0}
          className={`${primaryButton} w-full`}
        >
          {pending ? (
            <Pending>Booking…</Pending>
          ) : (
            <>Confirm booking&nbsp;· {formatMyr(totalSen)}</>
          )}
        </button>
      </div>
      <div className="grid gap-1 text-[0.85rem]">
        {cancellation ? (
          <p className="text-emerald-800">{cancellation}</p>
        ) : null}
        <p className="text-slate-500">
          No payment now. We will confirm your booking by email.
        </p>
      </div>
    </form>
  );
}

function Field({
  label: text,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={label}>
        {text}
        {optional ? (
          <span className="font-normal text-slate-500"> (optional)</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
