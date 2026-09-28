"use client";

import { useActionState } from "react";
import type { TripCategory } from "@repo/db";
import { control, primaryButton } from "../../../../_components/Page";
import { createTripBookingAction, type ConfirmState } from "./actions";

/**
 * Name and phone, then the booking is created. The trip travels as the
 * page's category and its query string in hidden fields, so the action
 * prices it again from scratch.
 */
export function ConfirmForm({
  category,
  trip,
  defaultName,
  defaultPhone,
}: {
  category: TripCategory;
  /** The confirm page's query string. */
  trip: string;
  defaultName: string;
  defaultPhone: string;
}) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(
    createTripBookingAction,
    null,
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="trip" value={trip} />
      <label className="block">
        <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
          Name for the driver
        </span>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={defaultName}
          autoComplete="name"
          className={control}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
          Phone number
        </span>
        <input
          name="phone"
          type="tel"
          required
          defaultValue={defaultPhone}
          placeholder="+60 12 345 6789"
          autoComplete="tel"
          className={control}
        />
        <span className="mt-1.5 block text-[0.85rem] text-[#67726f]">
          Your driver will reach you on WhatsApp or by call.
        </span>
      </label>
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
