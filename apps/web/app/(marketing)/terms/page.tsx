import type { Metadata } from "next";
import { SiteDocumentPage } from "../../_site/SiteDocumentPage";
import { documentMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return documentMetadata("terms");
}

/** Route: /terms. The terms and conditions, as published. A 404 until it is. */
export default function TermsPage() {
  return <SiteDocumentPage page="terms" />;
}
