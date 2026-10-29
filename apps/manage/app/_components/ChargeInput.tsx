"use client";

import type { SurchargeKind } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { Input } from "@repo/ui/field";
import { Choices } from "./Choices";

/** The two kinds of charge, as the switch beside the amount shows them. */
const KINDS = [
  { value: "percent", label: "%", name: "A percentage" },
  { value: "flat", label: "RM", name: "A flat amount" },
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

  return (
    <>
      <input type="hidden" name={kindName} value={kind} />
      <span className="relative">
        {kind === "flat" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"
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
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted"
          >
            %
          </span>
        ) : null}
      </span>
      <Choices
        label={`The ${label.toLowerCase()} is`}
        value={kind}
        options={KINDS}
        onChange={choose}
      />
    </>
  );
}
