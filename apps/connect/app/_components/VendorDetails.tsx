import {
  VENDOR_FIELD_LABELS,
  VENDOR_KIND_LABELS,
  VENDOR_SERVICE_LABELS,
  isVendorKind,
  vendorServicesOf,
} from "@repo/db";
import type { VendorWithLocations } from "@repo/db/server";
import { Rows } from "@repo/ui/rows";
import { bankCell, masked } from "@repo/console/masked";

/**
 * A vendor's details as its own people read them, on the registration's
 * status and on the account's Business: every sensitive one (the SSM or IC number, the
 * contact's phone and email, the bank account) blurred until clicked, so
 * the screen can be shown to someone. See docs/261103-tour-guide.md, "Pay
 * and bank details".
 */
export function VendorDetails({
  vendor,
  className,
}: {
  vendor: VendorWithLocations;
  className?: string;
}) {
  return (
    <Rows
      className={className}
      rows={[
        [VENDOR_FIELD_LABELS.name, vendor.name],
        [
          VENDOR_FIELD_LABELS.kind,
          isVendorKind(vendor.kind)
            ? VENDOR_KIND_LABELS[vendor.kind]
            : vendor.kind,
        ],
        [
          VENDOR_FIELD_LABELS.registrationNo,
          masked(vendor.registrationNo, "number"),
        ],
        [VENDOR_FIELD_LABELS.contactName, vendor.contactName],
        [
          VENDOR_FIELD_LABELS.contactPhone,
          masked(vendor.contactPhone, "phone"),
        ],
        [
          VENDOR_FIELD_LABELS.contactEmail,
          masked(vendor.contactEmail, "email"),
        ],
        [VENDOR_FIELD_LABELS.address, vendor.address || "None yet"],
        [
          VENDOR_FIELD_LABELS.services,
          // Chosen at sign-up; only the team changes it.
          <>
            {vendorServicesOf(vendor.services)
              .map((service) => VENDOR_SERVICE_LABELS[service])
              .join(", ") || "None yet"}
            <span className="block text-xs font-normal text-muted">
              To offer something else, contact us.
            </span>
          </>,
        ],
        [
          VENDOR_FIELD_LABELS.locationIds,
          vendor.locations.map((location) => location.name).join(", ") ||
            "None yet",
        ],
        ["Bank", bankCell(vendor)],
      ]}
    />
  );
}
