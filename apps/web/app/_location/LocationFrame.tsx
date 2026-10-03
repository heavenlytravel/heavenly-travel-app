import type { ReactNode } from "react";
import Link from "next/link";
import {
  LOCATION_PAGE_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  locationPreviewPath,
  type LocationView,
  type LocationViewPage,
} from "@repo/db/server";
import { Closing, SiteFooter } from "../_home/Sections";
import { fontVars } from "../_home/fonts";
import styles from "../_home/home.module.css";
import { LocationHeader, LocationSearch } from "./LocationSearch";

/**
 * What every page of a location shares: the home page's type and palette,
 * the site header, the search card's state, the closing call and the
 * footer. The public pages get it from their layout, so the search card
 * keeps what was typed from page to page. `previewOf` is the page a staff
 * preview is showing, and puts the preview bar on top.
 */
export function LocationFrame({
  location,
  previewOf,
  children,
}: {
  location: LocationView;
  previewOf?: LocationViewPage;
  children: ReactNode;
}) {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen font-(family-name:--font-body) leading-normal antialiased`}
    >
      {previewOf && <PreviewBar location={location} page={previewOf} />}
      <LocationHeader />
      <LocationSearch name={location.name} addresses={location.addresses}>
        <main className="pb-[60px] sm:pb-[88px]">{children}</main>
        <Closing />
      </LocationSearch>
      <SiteFooter />
    </div>
  );
}

/**
 * The bar on top of a staff preview: that this is a preview, the
 * location's state, where the page shown stands against its published
 * copy, and the way to the location's other pages, published or not.
 */
function PreviewBar({
  location,
  page: shown,
}: {
  location: LocationView;
  page: LocationViewPage;
}) {
  return (
    <aside
      aria-label="Preview"
      className="sticky top-0 z-30 flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b-[3px] border-[#caa243] bg-[#082f2b] px-5 py-2.5 text-[0.85rem] text-white sm:px-[clamp(20px,5vw,76px)]"
    >
      <p>
        <strong className="mr-2.5 tracking-[0.16em] uppercase">Preview</strong>
        {location.name} · {LOCATION_STATE_LABELS[location.state]} · This page:{" "}
        {PAGE_STATUS_LABELS[shown.status]}
      </p>
      <nav aria-label="Pages of this location" className="flex gap-x-5">
        {location.pages.map(({ page }) => (
          <Link
            key={page}
            href={locationPreviewPath(location.slug, page)}
            aria-current={page === shown.page ? "page" : undefined}
            className="font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243] aria-[current]:underline"
          >
            {LOCATION_PAGE_LABELS[page]}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
