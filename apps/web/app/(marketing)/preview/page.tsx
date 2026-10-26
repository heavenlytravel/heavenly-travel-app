import type { Metadata } from "next";
import { HOME_PAGE } from "@repo/db/server";
import { SitePagePreview } from "../../_site/SitePagePreview";
import { previewMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata(HOME_PAGE);
}

/** Route: /preview. The home page as drafted, for staff. */
export default function HomePagePreview() {
  return <SitePagePreview page={HOME_PAGE} />;
}
