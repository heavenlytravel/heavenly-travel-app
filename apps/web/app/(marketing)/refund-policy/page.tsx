import type { Metadata } from "next";
import { SiteDocumentPage } from "../../_site/SiteDocumentPage";
import { documentMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return documentMetadata("refund-policy");
}

/** Route: /refund-policy. Cancellations and refunds, as published. A 404 until it is. */
export default function RefundPolicyPage() {
  return <SiteDocumentPage page="refund-policy" />;
}
