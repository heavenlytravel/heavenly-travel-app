import {
  isVendorStatus,
  VENDOR_STATUS_LABELS,
  type VendorStatus,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";

const TONES: Record<VendorStatus, "green" | "amber" | "red" | "neutral"> = {
  active: "green",
  pending: "amber",
  refused: "neutral",
  suspended: "red",
};

/** A vendor's status as a badge: waiting stands out in amber, suspended in red. */
export function VendorStatusBadge({ status }: { status: string }) {
  if (!isVendorStatus(status)) return <Badge>{status}</Badge>;
  return <Badge tone={TONES[status]}>{VENDOR_STATUS_LABELS[status]}</Badge>;
}
