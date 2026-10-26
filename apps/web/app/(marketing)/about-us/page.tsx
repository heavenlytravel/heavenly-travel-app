import type { Metadata } from "next";
import { SiteDocumentPage } from "../../_site/SiteDocumentPage";
import { documentMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return documentMetadata("about-us");
}

/** Route: /about-us. Who we are, as Marketing published it. A 404 until it is. */
export default function AboutUsPage() {
  return <SiteDocumentPage page="about-us" />;
}
