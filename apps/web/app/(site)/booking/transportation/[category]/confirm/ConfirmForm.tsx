"use client";

import { useActionState, useState } from "react";
import { CONTACT_NAME_MAX_LENGTH, type TripCategory } from "@repo/db";
import Link from "next/link";
import { control, primaryButton, textLink } from "../../../../_components/Page";
import { createTripBookingAction, type ConfirmState } from "./actions";
import { CONFIRM_FIELDS } from "./fields";

const label = "mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]";
const hint = "mt-1.5 block text-[0.85rem] text-[#67726f]";

/**
 * Name, phone and email, then the booking is created. The trip travels as
 * the page's category and its query string in hidden fields, so the action
 * prices it again from scratch. Signed in, the email is the account's and
 * cannot be edited here; signed out, a line offers sign-in, which comes
 * back to this page. The fields are controlled: React resets a form once
 * its action returns, and an answer that is an error must not wipe what
 * the customer typed.
 */
export function ConfirmForm({
  category,
  trip,
  defaultName,
  defaultPhone,
  accountEmail,
  signInHref,
}: {
  category: TripCategory;
  /** The confirm page's query string. */
  trip: string;
  defaultName: string;
  defaultPhone: string;
  /** The signed-in customer's email, or null for a visitor. */
  accountEmail: string | null;
  /** Where a visitor signs in; null when signed in. */
  signInHref: string | null;
}) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(
    createTripBookingAction,
    null,
  );
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(accountEmail ?? "");
  const locked = accountEmail !== null;

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name={CONFIRM_FIELDS.category} value={category} />
      <input type="hidden" name={CONFIRM_FIELDS.trip} value={trip} />
      {signInHref && (
        <p className="text-[0.9rem] text-[#67726f]">
          Have an account?{" "}
          <Link href={signInHref} className={textLink}>
            Sign in
          </Link>
        </p>
      )}
      <label className="block">
        <span className={label}>Name for the driver</span>
        <input
          name={CONFIRM_FIELDS.name}
          required
          maxLength={CONTACT_NAME_MAX_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={control}
        />
      </label>
      <label className="block">
        <span className={label}>Phone number</span>
        <input
          name={CONFIRM_FIELDS.phone}
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+60 12 345 6789"
          autoComplete="tel"
          className={control}
        />
        <span className={hint}>
          Your driver will reach you on WhatsApp or by call.
        </span>
      </label>
      <label className="block">
        <span className={label}>Email</span>
        <input
          name={CONFIRM_FIELDS.email}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={locked}
          autoComplete="email"
          className={`${control} ${locked ? "bg-[#f3f6f5] text-[#324844]" : ""}`}
        />
        <span className={hint}>
          {locked
            ? "From your account. Your booking emails go here."
            : "We need your email to send your booking confirmation."}
        </span>
      </label>
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
      {state?.error && (
        <p role="alert" className="text-[0.95rem] text-[#b3261e]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Booking…" : "Confirm booking"}
      </button>
      <p className="text-[0.85rem] text-[#67726f]">
        No payment now. We will confirm your booking by email.
      </p>
    </form>
  );
}
