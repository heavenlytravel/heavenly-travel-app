import type { ReactNode } from "react";
import {
  ADMIN_URL,
  LANDING_REF,
  LOCATION_STATE_LABELS,
  LOCATION_SECTIONS,
  childrenInView,
  classOfPage,
  locationPreviewPath,
  pageEditorPath,
  pageNameInView,
  pageOfView,
  type LocationView,
  type LocationViewPage,
} from "@repo/db/server";
import { Footer } from "../_components/Footer";
import { SiteHeader } from "../_components/SiteHeader";
import {
  PreviewBar,
  type PreviewPage,
  type PreviewStanding,
} from "../_components/PreviewBar";
import {
  headerDestinations,
  locationSearchPreview,
  publicLocationSearch,
} from "../_lib/locations";
import { fontVars } from "../_home/fonts";
import { LocationSearch } from "./LocationSearch";

/**
 * What every page of a location shares: the home page's type and palette,
 * the site header, the search card's state and the footer as published.
 * The public pages get it from their layout, so the search card keeps
 * what was typed from page to page; the card searches all of Malaysia,
 * the location's area first. `previewOf` is the page a staff
 * preview is showing, and floats the preview bar over it.
 */
export async function LocationFrame({
  location,
  previewOf,
  children,
}: {
  location: LocationView;
  previewOf?: LocationViewPage;
  children: ReactNode;
}) {
  const [search, destinations] = await Promise.all([
    previewOf
      ? locationSearchPreview(location.slug)
      : publicLocationSearch(location.slug),
    headerDestinations(),
  ]);
  return (
    <div
      className={`${fontVars} min-h-screen bg-canvas font-sans leading-normal text-slate-900 antialiased`}
    >
      <SiteHeader destinations={destinations} />
      <LocationSearch
        slug={location.slug}
        name={location.name}
        addresses={location.addresses}
        search={search}
      >
        {/* Room between the page and the footer. */}
        <main className="pb-[60px] sm:pb-[88px]">{children}</main>
      </LocationSearch>
      {/* The public footer: its draft is SUPER's to preview, on a site page. */}
      <Footer />
      {previewOf && <LocationPreviewBar location={location} page={previewOf} />}
    </div>
  );
}

/**
 * The preview bar of a location's page: where the page shown stands
 * against its published copy, its editor, and the pages of the location,
 * published or not: the main page, then each section's own page with the
 * pages under it, under the location's state. A class's page is paused
 * while its class is off sale there, or no longer offered.
 */
function LocationPreviewBar({
  location,
  page: shown,
}: {
  location: LocationView;
  page: LocationViewPage;
}) {
  const standingOf = (entry: LocationViewPage): PreviewStanding =>
    entry.kind === "class" && !classOfPage(location, entry)?.onSale
      ? "paused"
      : entry.status;
  const linkOf = (entry: LocationViewPage): PreviewPage => ({
    href: locationPreviewPath(location.slug, entry),
    name:
      entry.page === LANDING_REF.page
        ? "Main page"
        : pageNameInView(location, entry),
    standing: standingOf(entry),
    current: entry.page === shown.page && entry.slug === shown.slug,
  });
  const groups = [
    LANDING_REF,
    ...LOCATION_SECTIONS.map((page) => ({ page, slug: "" })),
  ]
    .map((ref) => pageOfView(location, ref))
    .filter((entry) => entry !== undefined)
    .map((entry) => ({
      ...linkOf(entry),
      children: childrenInView(location, entry.page).map(linkOf),
    }));
  return (
    <PreviewBar
      name={pageNameInView(location, shown)}
      standing={standingOf(shown)}
      editHref={`${ADMIN_URL}${pageEditorPath(location.slug, shown)}`}
      title={`Pages of ${location.name}`}
      note={LOCATION_STATE_LABELS[location.state]}
      searchLabel={`Find a page of ${location.name}`}
      groups={groups}
    />
  );
}
