"use client";

import {
  assignStateOf,
  formatLocalDateTime,
  formatMyr,
  isLive,
  modelName,
  PART_ROLE_LABELS,
  rolesOf,
  partWaitingLabel,
  partWaitingOf,
  ringgitInputValue,
  ROLE_NOT_ASKED_LABEL,
  type PartRole,
} from "@repo/db";
import type { FulfilmentTrip, TripPartView } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { AssignStateBadge } from "@repo/console/StatusBadges";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { assignTripHref, type ScopeSlug } from "../../../../_lib/routes";
import { setPartCostAction } from "../../assign/actions";

/** "VLE1234 · Toyota Alphard", "Ali bin Abu", or "Any" while not named. */
function namedOf(part: TripPartView) {
  if (part.vehicle) {
    return `${part.vehicle.plate} · ${modelName(part.vehicle.vehicleModel)}`;
  }
  return part.driver?.name ?? part.guide?.name ?? "Any";
}

/**
 * "Who does it" on a booking, to read: each live trip with where it
 * stands, its vehicle and driver, and its tour guide when it goes with
 * one, their vendor and whose answer they
 * wait for. Assigning is Operation's, on the trip's page under Assign,
 * which "Open in Assign" leads to. A trip cancelled after its vendor
 * accepted shows what we pay that vendor, which Operation can change.
 * See docs/261028-fulfilment-vendors-and-connect.md.
 */
export function WhoDoesIt({
  bookingId,
  trips,
  canFulfil,
  scope,
}: {
  bookingId: string;
  trips: FulfilmentTrip[];
  canFulfil: boolean;
  scope: ScopeSlug;
}) {
  const live = trips.filter((t) => isLive(t) && t.status !== "completed");
  const owed = trips.filter(
    (t) =>
      t.status === "cancelled" &&
      t.parts.some((p) => !p.offer.vendor.isOurs && p.vendorAcceptedAt),
  );
  if (live.length === 0 && owed.length === 0) return null;

  return (
    <Card>
      <CardTitle description="Operation assigns each trip under Assign.">
        Who does it
      </CardTitle>
      <ul className="grid gap-4">
        {live.map((trip) => (
          <li key={trip.id} className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-ink">
                Trip {trip.position}, {formatLocalDateTime(trip.startsAt)}
              </span>
              {trip.status === "received" ? (
                <span className="text-muted">Assigned once confirmed</span>
              ) : (
                <AssignStateBadge
                  state={assignStateOf({ ...trip, reported: false })}
                />
              )}
              {canFulfil && trip.status !== "received" ? (
                <Link
                  href={assignTripHref(scope, trip.id)}
                  className="ml-auto text-sm font-medium text-brand underline-offset-4 hover:underline focus-ring"
                >
                  Open in Assign
                </Link>
              ) : null}
            </div>
            {trip.parts.length > 0 ? (
              <dl className="grid gap-0.5 text-caption">
                {rolesOf(trip.withGuide).map((role) => {
                  const part = trip.parts.find((p) => p.role === role);
                  const waiting = part
                    ? partWaitingOf(part, part.offer.vendor.isOurs)
                    : null;
                  return (
                    <div key={role} className="flex flex-wrap gap-x-1.5">
                      <dt className="text-muted">{PART_ROLE_LABELS[role]}</dt>
                      <dd className={part ? "text-body" : "text-muted"}>
                        {part
                          ? `${namedOf(part)} · ${part.offer.vendor.name}`
                          : ROLE_NOT_ASKED_LABEL}
                        {part && waiting ? (
                          <span className="text-warning">
                            {" "}
                            ·{" "}
                            {partWaitingLabel(waiting, part.offer.vendor.name)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>
      {owed.map((trip) => (
        <div
          key={trip.id}
          className="mt-4 grid gap-2 border-t border-hairline pt-3"
        >
          <p className="text-sm font-medium">
            Trip {trip.position}, cancelled: pay vendor
          </p>
          {trip.parts
            .filter((p) => !p.offer.vendor.isOurs && p.vendorAcceptedAt)
            .map((part) => (
              <CostRow
                key={part.id}
                bookingId={bookingId}
                part={part}
                canFulfil={canFulfil}
              />
            ))}
        </div>
      ))}
    </Card>
  );
}

/** What we owe a vendor for a part of a cancelled trip, and the way to change it. */
function CostRow({
  bookingId,
  part,
  canFulfil,
}: {
  bookingId: string;
  part: TripPartView;
  canFulfil: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(setPartCostAction, {
    done: "Cost saved.",
    onDone: () => setOpen(false),
  });
  const line: ReactNode = (
    <span>
      {PART_ROLE_LABELS[part.role as PartRole]}, {part.offer.vendor.name}:{" "}
      {formatMyr(part.costSen)}
      {part.tipSen > 0 ? ` + ${formatMyr(part.tipSen)} tip` : null}
    </span>
  );
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {line}
        {canFulfil ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(true)}
          >
            Change cost
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <form
      {...formProps}
      className="grid gap-2 rounded-control border border-card-edge bg-shade p-3"
    >
      {line}
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="partId" value={part.id} />
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Amount (RM)">
          <Input
            name="costSen"
            inputMode="decimal"
            required
            defaultValue={ringgitInputValue(part.costSen)}
          />
        </Field>
        <Field label="Reason">
          <Input name="reason" required maxLength={200} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" pending={pending}>
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <FormError error={error} size="xs" />
    </form>
  );
}
