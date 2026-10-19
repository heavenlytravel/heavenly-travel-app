"use client";

import {
  CHARGE_LIMITS,
  ringgitInputValue,
  timeOfMinute,
  type OddHours,
  type SurchargeKind,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { TimeField } from "@repo/ui/date-field";
import { toast } from "@repo/ui/toast";
import { useActionState, useState } from "react";
import { ChargeInput } from "../../../../_components/ChargeInput";
import type { ActionState } from "../../../../_lib/action-state";
import { setOddHoursAction } from "./actions";

/** The amount as the field shows it: a whole percentage, or ringgit. */
function amountOf(window: OddHours | null) {
  if (!window) return "";
  return window.percent !== null
    ? String(window.percent)
    : ringgitInputValue(window.flatSen);
}

/**
 * The surcharge as one sentence: "Trips that start between 11:00 PM and
 * 7:00 AM cost 20 % more", or "RM 30 more" with the switch beside the
 * amount on RM. The window and the amount are saved together; all of them
 * empty removes the surcharge, which "Clear" then "Remove surcharge" does.
 */
export function OddHoursForm({
  locationId,
  window,
}: {
  locationId: string;
  /** The surcharge in force; null for none. */
  window: OddHours | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await setOddHoursAction(previous, formData);
      if (result === null) {
        const removed = ["from", "to", "amount"].every(
          (field) => !String(formData.get(field) ?? "").trim(),
        );
        toast.success(removed ? "Surcharge removed." : "Surcharge saved.");
      }
      return result;
    },
    null,
  );
  const [from, setFrom] = useState(
    window ? timeOfMinute(window.fromMinute) : "",
  );
  const [to, setTo] = useState(window ? timeOfMinute(window.toMinute) : "");
  const [kind, setKind] = useState<SurchargeKind>(
    window && window.percent === null ? "flat" : "percent",
  );
  const [amount, setAmount] = useState(amountOf(window));
  const empty = from === "" && to === "" && amount === "";
  const unchanged = window
    ? from === timeOfMinute(window.fromMinute) &&
      to === timeOfMinute(window.toMinute) &&
      kind === (window.percent === null ? "flat" : "percent") &&
      amount === amountOf(window)
    : empty;

  function clear() {
    setFrom("");
    setTo("");
    setAmount("");
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 text-sm text-neutral-700">
        <span>Trips that start between</span>
        <TimeField
          name="from"
          aria-label="Window starts at"
          className="w-36"
          value={from}
          onChange={setFrom}
        />
        <span>and</span>
        <TimeField
          name="to"
          aria-label="Window ends at"
          className="w-36"
          value={to}
          onChange={setTo}
        />
        <span>cost</span>
        <ChargeInput
          name="amount"
          kindName="kind"
          label="Surcharge"
          kind={kind}
          amount={amount}
          onKindChange={setKind}
          onAmountChange={setAmount}
        />
        <span>more.</span>
      </div>
      <p className="text-xs text-neutral-500">
        {kind === "percent"
          ? `A whole percentage of the trip's price, up to ${CHARGE_LIMITS.maxPercent}%.`
          : "One amount added to every trip in the window, whatever its price."}{" "}
        A window that ends before it starts runs past midnight: 11:00 PM to 7:00
        AM holds 11:30 PM and 6:00 AM.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || unchanged}>
          {pending ? "Saving…" : empty && window ? "Remove surcharge" : "Save"}
        </Button>
        {window && !empty ? (
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
        ) : null}
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
