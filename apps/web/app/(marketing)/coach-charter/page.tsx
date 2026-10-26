import type { Metadata } from "next";
import { SiteHubPage } from "../../_site/SiteHubPage";
import { hubMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return hubMetadata("coach-charter");
}

/** Route: /coach-charter. Coach charter's hub: the locations that offer it. */
export default function CoachCharterPage() {
  return <SiteHubPage page="coach-charter" />;
}
