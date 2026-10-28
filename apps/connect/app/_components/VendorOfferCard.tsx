"use client";

import { formatLocalDateTime, formatMyr, PART_ROLE_LABELS } from "@repo/db";
import type { OfferRole, VendorOfferView } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Field } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { Card } from "@repo/console/Card";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "@repo/console/use-action-form";
import { answerVendorOfferAction, nameRecordAction } from "../vendor-actions";
import { OfferAnswer, OfferTrips, OfferWarnings } from "./OfferCard";

/**
 * An offer to the vendor: the trips by area, and for each what we pay for
 * the vehicle and the driver asked, never the customer's price. Where the
 * vendor is to choose, its own vehicles or drivers to pick from, those
 * that cannot do it greyed with why. Accepting needs each named; the
 * timing warnings of what is named stand above the buttons. A member who
 * is the driver named accepts their own driving with it.
 */
export function VendorOfferCard({ offer }: { offer: VendorOfferView }) {
  const unnamed = offer.roles.find((r) => r.named === null);
  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-slate-500">
          Answer by {formatLocalDateTime(offer.respondBy)}
        </span>
        {offer.ownDriving ? <Badge tone="blue">You drive</Badge> : null}
      </div>
      <OfferTrips
        trips={offer.trips}
        reference={offer.reference}
        extra={(trip) => (
          <span className="text-sm text-slate-700">
            {offer.roles
              .map((role) => {
                const cost = role.costs.find(
                  (c) => c.position === trip.position,
                );
                return `${PART_ROLE_LABELS[role.role]} ${formatMyr(cost?.costSen ?? 0)}`;
              })
              .join(" · ")}
          </span>
        )}
      />
      <dl className="grid gap-2 text-sm">
        {offer.roles.map((role) => (
          <div key={role.role} className="grid gap-1">
            <dt className="font-medium">{PART_ROLE_LABELS[role.role]}</dt>
            <dd>
              {role.named ? (
                role.named
              ) : (
                <NameRecord offerId={offer.offerId} role={role} />
              )}
            </dd>
          </div>
        ))}
      </dl>
      <OfferWarnings warnings={offer.warnings} />
      <OfferAnswer
        action={answerVendorOfferAction}
        offerId={offer.offerId}
        blocked={
          unnamed ? `Choose the ${unnamed.role} above, then accept.` : undefined
        }
      />
    </Card>
  );
}

/** Picks the vendor's own vehicle or driver for a role it was left to choose. */
function NameRecord({ offerId, role }: { offerId: string; role: OfferRole }) {
  const { pending, error, formProps } = useActionForm(nameRecordAction, {
    done: `${PART_ROLE_LABELS[role.role]} chosen.`,
  });
  if (role.choices.length === 0) {
    return (
      <p className="text-slate-600">
        You have no {role.role} in service yet. Add one, or decline.
      </p>
    );
  }
  return (
    <form {...formProps} className="grid gap-2">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="role" value={role.role} />
      <Field label={`Your ${role.role}`}>
        <Select
          name="recordId"
          required
          placeholder={`Choose the ${role.role}`}
          options={role.choices.map((choice) => ({
            value: choice.id,
            label:
              choice.reasons.length > 0
                ? `${choice.name}: ${choice.reasons.join(", ")}`
                : choice.name,
            disabled: choice.reasons.length > 0,
          }))}
        />
      </Field>
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Choose"}
        </Button>
      </div>
      <FormError error={error} />
    </form>
  );
}
