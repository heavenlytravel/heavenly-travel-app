"use client";

import { formatLocalDateTime, formatMyr, PART_ROLE_LABELS } from "@repo/db";
import type { OfferRole, VendorOfferView } from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { CarFrontIcon, ClockIcon, UserRoundIcon } from "@repo/ui/icons";
import { Countdown } from "../_ui/Countdown";
import { Avatar, Pill, Plate } from "../_ui/parts";
import { answerVendorOfferAction, nameRecordAction } from "../vendor-actions";
import {
  OfferAnswer,
  OfferPanel,
  OfferTrips,
  OfferWarnings,
} from "./OfferCard";

/**
 * An offer to the vendor: what we pay first, large, then the trips by
 * area with each one's amounts, never the customer's price. Where the
 * vendor is to choose, its own vehicles or drivers to tap, those that
 * cannot do it greyed with why. Accepting needs each named; the timing
 * warnings of what is named stand above the buttons. A member who is the
 * driver named accepts their own driving with it.
 */
export function VendorOfferCard({
  offer,
  now,
}: {
  offer: VendorOfferView;
  now: Date;
}) {
  const unnamed = offer.roles.find((r) => r.named === null);
  const total = offer.roles.reduce(
    (sum, role) => sum + role.costs.reduce((s, c) => s + c.costSen, 0),
    0,
  );
  return (
    <OfferPanel
      head={
        <>
          <span className="flex items-center gap-2">
            <Pill tone="amber">New offer</Pill>
            {offer.ownDriving ? <Pill tone="brand">You drive</Pill> : null}
          </span>
          <span
            className="flex items-center gap-1 text-xs font-semibold text-warning"
            title={formatLocalDateTime(offer.respondBy)}
          >
            <ClockIcon className="size-3.5" />
            Answer <Countdown at={offer.respondBy} />
          </span>
        </>
      }
    >
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-caps font-semibold text-muted">We pay you</span>
          <span className="font-serif text-4xl leading-none text-ink tabular-nums">
            {formatMyr(total)}
          </span>
        </div>
        <span className="pb-1 text-xs font-semibold text-muted tabular-nums">
          {offer.reference}
        </span>
      </div>
      <OfferTrips
        trips={offer.trips}
        now={now}
        extra={(trip) =>
          offer.trips.length > 1 || offer.roles.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {offer.roles.map((role) => {
                const cost = role.costs.find(
                  (c) => c.position === trip.position,
                );
                return (
                  <Badge key={role.role} tone="green" className="tabular-nums">
                    {PART_ROLE_LABELS[role.role]}{" "}
                    {formatMyr(cost?.costSen ?? 0)}
                  </Badge>
                );
              })}
            </div>
          ) : null
        }
      />
      <div className="grid gap-3">
        {offer.roles.map((role) => (
          <RoleRow key={role.role} offerId={offer.offerId} role={role} />
        ))}
      </div>
      <OfferWarnings warnings={offer.warnings} />
      <OfferAnswer
        action={answerVendorOfferAction}
        offerId={offer.offerId}
        blocked={
          unnamed ? `Choose the ${unnamed.role} above, then accept.` : undefined
        }
      />
    </OfferPanel>
  );
}

/** What the offer asks of the vendor for one role: named already, or theirs to choose. */
function RoleRow({ offerId, role }: { offerId: string; role: OfferRole }) {
  const Icon = role.role === "vehicle" ? CarFrontIcon : UserRoundIcon;
  return (
    <div className="grid gap-3 rounded-card border border-card-edge bg-shade p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-ink">
          <Icon className="size-4 text-muted" />
          {PART_ROLE_LABELS[role.role]}
        </span>
        {role.named ? (
          role.role === "vehicle" ? (
            <Plate>{role.named}</Plate>
          ) : (
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Avatar name={role.named} size="sm" />
              {role.named}
            </span>
          )
        ) : (
          <Pill tone="amber">Yours to choose</Pill>
        )}
      </div>
      {role.named ? null : <NameRecord offerId={offerId} role={role} />}
    </div>
  );
}

/** Picks the vendor's own vehicle or driver for a role it was left to choose, by tapping one. */
function NameRecord({ offerId, role }: { offerId: string; role: OfferRole }) {
  const { pending, error, formProps } = useActionForm(nameRecordAction, {
    done: `${PART_ROLE_LABELS[role.role]} chosen.`,
  });
  if (role.choices.length === 0) {
    return (
      <p className="text-sm text-muted">
        You have no {role.role} in service yet. Add one in Fleet, or decline.
      </p>
    );
  }
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="role" value={role.role} />
      <fieldset className="grid gap-2">
        <legend className="sr-only">Your {role.role}</legend>
        {role.choices.map((choice) => {
          const blocked = choice.reasons.length > 0;
          return (
            <label
              key={choice.id}
              className={cx(blocked ? "cursor-not-allowed" : "cursor-pointer")}
            >
              <input
                type="radio"
                name="recordId"
                value={choice.id}
                required
                disabled={blocked}
                className="peer sr-only"
              />
              <span className="flex items-center gap-3 rounded-control border border-edge bg-white px-3 py-2.5 transition-colors peer-checked:border-brand peer-checked:ring-1 peer-checked:ring-brand peer-focus-visible:outline-(length:--ring-width) peer-focus-visible:outline-offset-(length:--ring-offset) peer-focus-visible:outline-ring peer-disabled:opacity-55">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-semibold text-ink">
                    {choice.name}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {blocked
                      ? choice.reasons.join(", ")
                      : [choice.locationName, ...choice.warnings].join(" · ")}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="size-5 shrink-0 rounded-full ring-2 ring-edge-strong ring-inset [input:checked+span_&]:ring-[6px] [input:checked+span_&]:ring-brand"
                />
              </span>
            </label>
          );
        })}
      </fieldset>
      <Button type="submit" variant="secondary" pending={pending}>
        {pending ? "Saving…" : `Choose this ${role.role}`}
      </Button>
      <FormError error={error} />
    </form>
  );
}
