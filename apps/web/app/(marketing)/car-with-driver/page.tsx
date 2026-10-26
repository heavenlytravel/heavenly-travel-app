import type { Metadata } from "next";
import { SiteHubPage } from "../../_site/SiteHubPage";
import { hubMetadata } from "../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return hubMetadata("car-with-driver");
}

/** Route: /car-with-driver. Car with driver's hub: the locations that offer it. */
export default function CarWithDriverPage() {
  return <SiteHubPage page="car-with-driver" />;
}
