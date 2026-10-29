"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";
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
import { clearOfFold } from "../../../../../_components/trips/TripsBar";
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
const label = "mb-1.5 block text-copy font-semibold text-slate-800";
const hint = "mt-1.5 block text-caption text-muted";
const refused = "mt-1.5 block text-caption text-danger";
/** A field given the focus comes into view clear of the site header and, on a phone, the pinned trips. */
const inView = `${clearOfFold} scroll-mb-8`;

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
  const ids = useId();
  /**
   * The line under a field, outside its label: why it was refused, or its
   * hint; `describedBy` ties the field's control to it, so it is read as
   * the field's description, not as part of its name.
   */
  const lineOf = (field: string, text?: string) => {
    const id = `${ids}-${field}`;
    const line = errors[field] ? (
      <span id={id} role="alert" className={refused}>
        {errors[field]}
      </span>
    ) : text ? (
      <span id={id} className={hint}>
        {text}
      </span>
    ) : null;
    return { line, describedBy: line ? id : undefined };
  };
  const nameLine = lineOf(CONFIRM_FIELDS.name);
  const phoneLine = lineOf(
    CONFIRM_FIELDS.phone,
    "Your driver will reach you on WhatsApp or by call.",
  );
  const emailLine = lineOf(
    CONFIRM_FIELDS.email,
    locked
      ? "From your account. Your booking emails go here."
      : "We need your email to send your booking confirmation.",
  );
  const arrivingLine = lineOf(
    CONFIRM_FIELDS.arrivingFlight,
    `For the pick-up at ${arriving}. Your driver follows it, and waits if it lands late.`,
  );
  const departingLine = lineOf(
    CONFIRM_FIELDS.departingFlight,
    `For the drop-off at ${departing}, so your driver leaves time for check-in.`,
  );
  const notesLine = lineOf(
    CONFIRM_FIELDS.notes,
    "Every driver on this booking sees it.",
  );
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
        <p className="text-copy text-muted">
          Have an account?{" "}
          <Link href={signInHref} className={textLink}>
            Sign in
          </Link>
        </p>
      )}
      <Field label="Name for the driver" line={nameLine.line}>
        <input
          name={CONFIRM_FIELDS.name}
          required
          maxLength={CONTACT_NAME_MAX_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          aria-describedby={nameLine.describedBy}
          className={`${control} ${inView}`}
        />
      </Field>
      <Field label="Phone number" line={phoneLine.line}>
        <input
          name={CONFIRM_FIELDS.phone}
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+60 12 345 6789"
          autoComplete="tel"
          aria-describedby={phoneLine.describedBy}
          className={`${control} ${inView}`}
        />
      </Field>
      <Field label="Email" line={emailLine.line}>
        <input
          name={CONFIRM_FIELDS.email}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={locked}
          autoComplete="email"
          aria-describedby={emailLine.describedBy}
          className={`${control} ${inView} ${locked ? "bg-mist text-slate-700" : ""}`}
        />
      </Field>
      {arriving !== null ? (
        <Field label="Arriving flight" optional line={arrivingLine.line}>
          <input
            name={CONFIRM_FIELDS.arrivingFlight}
            value={forDriver.arrivingFlight}
            maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
            onChange={(e) =>
              onForDriver({ arrivingFlight: e.target.value.toUpperCase() })
            }
            placeholder="MH 1234"
            autoComplete="off"
            aria-describedby={arrivingLine.describedBy}
            className={`${control} ${inView} uppercase`}
          />
        </Field>
      ) : null}
      {departing !== null ? (
        <Field label="Departing flight" optional line={departingLine.line}>
          <input
            name={CONFIRM_FIELDS.departingFlight}
            value={forDriver.departingFlight}
            maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
            onChange={(e) =>
              onForDriver({ departingFlight: e.target.value.toUpperCase() })
            }
            placeholder="AK 6305"
            autoComplete="off"
            aria-describedby={departingLine.describedBy}
            className={`${control} ${inView} uppercase`}
          />
        </Field>
      ) : null}
      <Field label="Notes for the driver" optional line={notesLine.line}>
        <textarea
          name={CONFIRM_FIELDS.notes}
          value={forDriver.notes}
          maxLength={TRIP_MAX_NOTES_LENGTH}
          onChange={(e) => onForDriver({ notes: e.target.value })}
          rows={3}
          placeholder="Luggage, a child seat, a meeting point, anything we should know"
          aria-describedby={notesLine.describedBy}
          className={control}
        />
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
          <p role="alert" className="text-copy text-danger">
            {alert}
          </p>
        ) : missing.length > 0 ? (
          <p className="text-copy text-slate-600">
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
      <div className="grid gap-1 text-caption">
        {cancellation ? <p className="text-success">{cancellation}</p> : null}
        <p className="text-muted">
          No payment now. We will confirm your booking by email.
        </p>
      </div>
    </form>
  );
}

/**
 * A field of the form: its label around the control, which takes its
 * name from it, and `line`, its hint or why it was refused, under the
 * label, which the control points at (`aria-describedby`).
 */
function Field({
  label: text,
  optional = false,
  line,
  children,
}: {
  label: string;
  optional?: boolean;
  line: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className={label}>
          {text}
          {optional ? (
            <span className="font-normal text-muted"> (optional)</span>
          ) : null}
        </span>
        {children}
      </label>
      {line}
    </div>
  );
}
