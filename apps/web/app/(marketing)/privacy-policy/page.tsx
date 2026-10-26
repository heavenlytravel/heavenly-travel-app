import type { Metadata } from "next";
import { SiteDocumentPage } from "../../_site/SiteDocumentPage";
import { documentMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return documentMetadata("privacy-policy");
}

/** Route: /privacy-policy. How we handle personal data, as published. A 404 until it is. */
export default function PrivacyPolicyPage() {
  return <SiteDocumentPage page="privacy-policy" />;
}
