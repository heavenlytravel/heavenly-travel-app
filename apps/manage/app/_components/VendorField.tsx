"use client";

import type { VendorOption } from "@repo/db/server";
import { Field } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";

/**
 * Whose a vehicle or a driver is, on their forms: ours first, then the
 * other active vendors. A vendor serves some locations only; the writer
 * refuses a record based where its vendor does not serve, under "Based
 * at".
 */
export function VendorField({
  vendors,
  defaultValue,
  what,
}: {
  vendors: readonly VendorOption[];
  defaultValue: string;
  /** "vehicle" or "driver", for the hint. */
  what: string;
}) {
  const ours = vendors.filter((v) => v.isOurs);
  const others = vendors.filter((v) => !v.isOurs);
  const option = (v: VendorOption) => ({
    value: v.id,
    label: v.status === "active" ? v.name : `${v.name} (${v.status})`,
  });
  return (
    <Field
      label={
        <span className="inline-flex items-center gap-1.5">
          Vendor
          <InfoTip
            text={`Whose ${what} it is. Ours costs nothing; another vendor's is paid per trip and accepts each job itself.`}
          />
        </span>
      }
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
