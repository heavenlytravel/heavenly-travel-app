"use client";

import type { SurchargeKind } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { Input } from "@repo/ui/field";
import { radioKeys } from "../_lib/radio-keys";

/** The two kinds of charge, as the switch beside the amount shows them. */
const KINDS = [
  ["percent", "%"],
  ["flat", "RM"],
] as const;

/**
 * What a charge adds, typed in a sentence: the amount, with "%" or "RM"
 * beside it, then the switch between the two. Controlled; the amount
 * posts under `name` and the kind under `kindName`. Switching empties the
 * amount, which was in the other unit. The odd-hours surcharge and the
 * charge to choose a model are typed here.
 */
export function ChargeInput({
  name,
  kindName,
  label,
  kind,
  amount,
  onKindChange,
  onAmountChange,
}: {
  name: string;
  kindName: string;
  /** What the charge is, as a screen reader hears the fields: "Surcharge". */
  label: string;
  kind: SurchargeKind;
  amount: string;
  onKindChange: (kind: SurchargeKind) => void;
  onAmountChange: (amount: string) => void;
}) {
  /** Switches to the other kind, its amount emptied; the kind there is stays as it is. */
  function choose(next: SurchargeKind) {
    if (next === kind) return;
    onKindChange(next);
    onAmountChange("");
  }
  const keys = radioKeys({
    count: KINDS.length,
    chosen: KINDS.findIndex(([value]) => value === kind),
    choose: (index) => choose(KINDS[index]![0]),
  });

  return (
    <>
      <input type="hidden" name={kindName} value={kind} />
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
          name={name}
          inputMode={kind === "flat" ? "decimal" : "numeric"}
          autoComplete="off"
          aria-label={
            kind === "flat" ? `${label} in RM` : `${label} in percent`
          }
          placeholder={kind === "flat" ? "30.00" : "20"}
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
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
        aria-label={`The ${label.toLowerCase()} is`}
        onKeyDown={keys.onKeyDown}
        className="inline-flex overflow-hidden rounded-md border border-neutral-300 bg-white"
      >
        {KINDS.map(([value, text], index) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            tabIndex={keys.tabIndexOf(index)}
            aria-label={value === "percent" ? "A percentage" : "A flat amount"}
            onClick={() => choose(value)}
            className={cx(
              "h-10 px-3 text-sm font-medium transition-colors focus-visible:relative focus-visible:outline-2 focus-visible:outline-neutral-900",
              value === "flat" && "border-l border-neutral-300",
              kind === value
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {text}
          </button>
        ))}
      </span>
    </>
  );
}
