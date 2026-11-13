import {
  DRIVER_FIELD_LABELS,
  GUIDE_FIELD_LABELS,
  dayOf,
  formatDay,
} from "@repo/db";
import type { DriverWithClasses, GuideWithVendor } from "@repo/db/server";
import { bankCell, masked } from "@repo/console/masked";
import { Rows } from "@repo/ui/rows";

/**
 * A record as its own people read it, a driver's or a guide's profile
 * beside the vendor's (./VendorDetails): every sensitive detail (a phone,
 * an email, an SSM or IC number, a bank account) blurred until clicked
 * (@repo/console's masked), so the screen can be shown to someone. See docs/261103-tour-guide.md,
 * "Pay and bank details".
 */

const dayCell = (date: Date | null) => {
  const day = dayOf(date);
  return day ? formatDay(day) : "None yet";
};

export function DriverDetails({ driver }: { driver: DriverWithClasses }) {
  return (
    <Rows
      rows={[
        [DRIVER_FIELD_LABELS.name, driver.name],
        ["Driver For", driver.vendor.name],
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
        ["Paid To", bankCell(driver, driver.vendor.name)],
      ]}
    />
  );
}

export function GuideDetails({ guide }: { guide: GuideWithVendor }) {
  return (
    <Rows
      rows={[
        [GUIDE_FIELD_LABELS.name, guide.name],
        ["Guide For", guide.vendor.name],
        [GUIDE_FIELD_LABELS.locationId, guide.location.name],
        [GUIDE_FIELD_LABELS.phone, masked(guide.phone, "phone")],
        [GUIDE_FIELD_LABELS.languages, guide.languages.join(", ")],
        [GUIDE_FIELD_LABELS.motacExpiresOn, dayCell(guide.motacExpiresOn)],
        ["Paid To", bankCell(guide, guide.vendor.name)],
      ]}
    />
  );
}
