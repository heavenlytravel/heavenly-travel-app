import type { Metadata } from "next";
import { SiteDocumentPage } from "../../_site/SiteDocumentPage";
import { documentMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return documentMetadata("contact-us");
}

/** Route: /contact-us. How to reach us: Marketing's text, then the company's details. A 404 until it is. */
export default function ContactUsPage() {
  return <SiteDocumentPage page="contact-us" />;
}
