import type { Metadata } from "next";
import { SitePagePreview } from "../../../_site/SitePagePreview";
import { previewMetadata } from "../../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata("terms");
}

/** Route: /preview/terms. The terms and conditions as drafted, for staff. */
export default function TermsPreview() {
  return <SitePagePreview page="terms" />;
}
