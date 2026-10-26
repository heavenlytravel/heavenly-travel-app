import type { Metadata } from "next";
import { SitePagePreview } from "../../../_site/SitePagePreview";
import { previewMetadata } from "../../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata("about-us");
}

/** Route: /preview/about-us. About us as drafted, for staff. */
export default function AboutUsPreview() {
  return <SitePagePreview page="about-us" />;
}
