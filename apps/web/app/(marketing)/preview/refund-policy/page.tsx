import type { Metadata } from "next";
import { SitePagePreview } from "../../../_site/SitePagePreview";
import { previewMetadata } from "../../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata("refund-policy");
}

/** Route: /preview/refund-policy. Cancellations and refunds as drafted, for staff. */
export default function RefundPolicyPreview() {
  return <SitePagePreview page="refund-policy" />;
}
