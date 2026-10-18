"use client";

import {
  ODD_HOURS,
  ringgitInputValue,
  timeOfMinute,
  type OddHours,
  type SurchargeKind,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { TimeField } from "@repo/ui/date-field";
import { Input } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import { useActionState, useState } from "react";
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
 * The surcharge as one sentence: "Trips that start between 23:00 and
 * 07:00 cost 20 % more", or "RM 30 more" with the switch beside the
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
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 text-sm text-neutral-700">
        <span>Trips that start between</span>
        <TimeField
          name="from"
          aria-label="Window starts at"
          value={from}
          onChange={setFrom}
        />
        <span>and</span>
        <TimeField
          name="to"
          aria-label="Window ends at"
          value={to}
          onChange={setTo}
        />
        <span>cost</span>
        <span className="relative">
          {kind === "flat" ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500"
            >
              RM
            </span>
          ) : null}
          <Input
            name="amount"
            inputMode={kind === "flat" ? "decimal" : "numeric"}
            autoComplete="off"
            aria-label={
              kind === "flat" ? "Surcharge in RM" : "Surcharge in percent"
            }
            placeholder={kind === "flat" ? "30.00" : "20"}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={cx(
              "w-28 text-right tabular-nums",
              kind === "flat" ? "pl-10" : "pr-8",
            )}
          />
          {kind === "percent" ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-500"
            >
              %
            </span>
          ) : null}
        </span>
        <span
          role="radiogroup"
          aria-label="The surcharge is"
          className="inline-flex overflow-hidden rounded-md border border-neutral-300 bg-white"
        >
          {(
            [
              ["percent", "%"],
              ["flat", "RM"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              aria-label={
                value === "percent" ? "A percentage" : "A flat amount"
              }
              onClick={() => {
                setKind(value);
                setAmount("");
              }}
              className={cx(
                "h-10 px-3 text-sm font-medium transition-colors focus-visible:relative focus-visible:outline-2 focus-visible:outline-neutral-900",
                value === "flat" && "border-l border-neutral-300",
                kind === value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              {label}
            </button>
          ))}
        </span>
        <span>more.</span>
      </div>
      <p className="text-xs text-neutral-500">
        {kind === "percent"
          ? `A whole percentage of the trip's price, up to ${ODD_HOURS.maxPercent}%.`
          : "One amount added to every trip in the window, whatever its price."}{" "}
        A window that ends before it starts runs past midnight: 23:00 to 07:00
        holds 23:30 and 06:00.
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
