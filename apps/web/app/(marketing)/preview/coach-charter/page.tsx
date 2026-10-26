import type { Metadata } from "next";
import { SitePagePreview } from "../../../_site/SitePagePreview";
import { previewMetadata } from "../../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata("coach-charter");
}

/** Route: /preview/coach-charter. Coach charter's hub as drafted, for staff. */
export default function CoachCharterPreview() {
  return <SitePagePreview page="coach-charter" />;
}
