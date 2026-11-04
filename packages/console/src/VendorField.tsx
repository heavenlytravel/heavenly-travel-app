"use client";

import { vendorAddsOf, type VendorAdds } from "@repo/db";
import type { VendorOption } from "@repo/db/server";
import { Field } from "@repo/ui/field";
import { Select } from "@repo/ui/select";

/** The noun each form names its record by, and what the vendor must add for it. */
const ADDS: Record<string, keyof VendorAdds> = {
  vehicle: "vehicles",
  driver: "drivers",
  "tour guide": "guides",
};

/**
 * Whose a vehicle, a driver or a guide is, on their forms: ours first,
 * then the other active vendors that offer it (`vendorAddsOf`), so an
 * agent-only vendor is never offered. The record's own vendor stays. A
 * vendor serves some locations only; the writer refuses a record based
 * where its vendor does not serve, under "Based at".
 */
export function VendorField({
  vendors,
  defaultValue,
  what,
}: {
  vendors: readonly VendorOption[];
  defaultValue: string;
  /** "vehicle", "driver" or "tour guide", for the hint and the vendors offered. */
  what: string;
}) {
  const adds = ADDS[what];
  const offered = vendors.filter(
    (v) => v.id === defaultValue || !adds || vendorAddsOf(v)[adds],
  );
  const ours = offered.filter((v) => v.isOurs);
  const others = offered.filter((v) => !v.isOurs);
  const option = (v: VendorOption) => ({
    value: v.id,
    label: v.status === "active" ? v.name : `${v.name} (${v.status})`,
  });
  return (
    <Field
      label="Vendor"
      tip={`Whose ${what} it is. Ours costs nothing; another vendor's is paid per trip and accepts each job itself.`}
    >
      <Select
        name="vendorId"
        required
        placeholder="Choose the vendor"
        defaultValue={defaultValue || (ours[0]?.id ?? "")}
        options={[
          ...(ours.length > 0
            ? [{ label: "Ours", options: ours.map(option) }]
            : []),
          ...(others.length > 0
            ? [{ label: "Other vendors", options: others.map(option) }]
            : []),
        ]}
      />
    </Field>
  );
}
