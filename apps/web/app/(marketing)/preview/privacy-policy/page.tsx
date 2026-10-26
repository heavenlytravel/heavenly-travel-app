import type { Metadata } from "next";
import { SitePagePreview } from "../../../_site/SitePagePreview";
import { previewMetadata } from "../../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata("privacy-policy");
}

/** Route: /preview/privacy-policy. The privacy policy as drafted, for staff. */
export default function PrivacyPolicyPreview() {
  return <SitePagePreview page="privacy-policy" />;
}
