import type { Metadata } from "next";
import { SitePagePreview } from "../../../_site/SitePagePreview";
import { previewMetadata } from "../../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata("contact-us");
}

/** Route: /preview/contact-us. Contact us as drafted, for staff. */
export default function ContactUsPreview() {
  return <SitePagePreview page="contact-us" />;
}
