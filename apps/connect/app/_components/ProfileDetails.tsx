import {
  DRIVER_FIELD_LABELS,
  GUIDE_FIELD_LABELS,
  PAID_TO_LABELS,
  dayOf,
  formatDay,
  type BankFields,
} from "@repo/db";
import type { DriverWithClasses, GuideWithVendor } from "@repo/db/server";
import { Rows } from "@repo/ui/rows";
import { MaskedText } from "@repo/ui/secret";
import type { ReactNode } from "react";

/**
 * A record as its own people read it, a driver's or a guide's profile
 * beside the vendor's (./VendorDetails): every sensitive detail (a phone,
 * an email, an SSM or IC number, a bank account) blurred until clicked,
 * so the screen can be shown to someone. See docs/261103-tour-guide.md,
 * "Pay and bank details".
 */

/** A sensitive value blurred until clicked; "None yet" when empty. */
export function masked(value: string | null, label: string): ReactNode {
  return value ? <MaskedText value={value} label={label} /> : "None yet";
}

/** Where we pay: the bank, the account number blurred, the name on it; or the vendor's account. */
export function bankCell(
  fields: BankFields & { paidToVendor?: boolean },
  vendorName?: string,
): ReactNode {
  if (fields.paidToVendor) {
    return vendorName
      ? `${PAID_TO_LABELS.vendor}, ${vendorName}`
      : PAID_TO_LABELS.vendor;
  }
  if (!fields.bankAccountNumber) return "None yet";
  return (
    <span className="inline-flex flex-wrap gap-x-1.5">
      {fields.bankName}
      <MaskedText value={fields.bankAccountNumber} label="account number" />
      <span className="text-muted">{fields.bankAccountName}</span>
    </span>
  );
}

const dayCell = (date: Date | null) => {
  const day = dayOf(date);
  return day ? formatDay(day) : "None yet";
};

export function DriverDetails({ driver }: { driver: DriverWithClasses }) {
  return (
    <Rows
      rows={[
        [DRIVER_FIELD_LABELS.name, driver.name],
        ["Driver for", driver.vendor.name],
        [DRIVER_FIELD_LABELS.locationId, driver.location.name],
        [DRIVER_FIELD_LABELS.phone, masked(driver.phone, "phone")],
        [DRIVER_FIELD_LABELS.email, masked(driver.email, "email")],
        [
          DRIVER_FIELD_LABELS.vehicleClassIds,
          driver.vehicleClasses.map((c) => c.name).join(", ") || "None yet",
        ],
        [
          DRIVER_FIELD_LABELS.licenceExpiresOn,
          dayCell(driver.licenceExpiresOn),
        ],
        [DRIVER_FIELD_LABELS.psvExpiresOn, dayCell(driver.psvExpiresOn)],
        ["Paid to", bankCell(driver, driver.vendor.name)],
      ]}
    />
  );
}

export function GuideDetails({ guide }: { guide: GuideWithVendor }) {
  return (
    <Rows
      rows={[
        [GUIDE_FIELD_LABELS.name, guide.name],
        ["Guide for", guide.vendor.name],
        [GUIDE_FIELD_LABELS.locationId, guide.location.name],
        [GUIDE_FIELD_LABELS.phone, masked(guide.phone, "phone")],
        [GUIDE_FIELD_LABELS.languages, guide.languages.join(", ")],
        [GUIDE_FIELD_LABELS.motacExpiresOn, dayCell(guide.motacExpiresOn)],
        ["Paid to", bankCell(guide, guide.vendor.name)],
      ]}
    />
  );
}
