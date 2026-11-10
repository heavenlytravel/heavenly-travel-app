import { CLASS_REASON_MAX_LENGTH } from "@repo/db";
import { Field, Input } from "@repo/ui/field";

/**
 * Why a vehicle not of the class booked does the trip, asked when one is
 * chosen, on Assign and in Connect alike: kept on the trip and in its
 * history for the team. `change` is the class given and the one booked,
 * "MPV instead of Sedan". See `ClassRule` in @repo/db.
 */
export function ClassReasonField({ change }: { change: string }) {
  return (
    <Field
      label={`Why ${change}?`}
      hint="Not the class booked: the team sees why on the booking."
    >
      <Input
        name="vehicleClassReason"
        required
        maxLength={CLASS_REASON_MAX_LENGTH}
        placeholder="No sedan free that morning"
      />
    </Field>
  );
}
