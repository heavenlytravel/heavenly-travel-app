import type { Metadata } from "next";
import { SitePagePreview } from "../../../_site/SitePagePreview";
import { previewMetadata } from "../../../_site/routes";

export function generateMetadata(): Promise<Metadata> {
  return previewMetadata("car-with-driver");
}

/** Route: /preview/car-with-driver. Car with driver's hub as drafted, for staff. */
export default function CarWithDriverPreview() {
  return <SitePagePreview page="car-with-driver" />;
}
