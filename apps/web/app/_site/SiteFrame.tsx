import type { ReactNode } from "react";
import {
  ADMIN_URL,
  SITE_PAGE_LABELS,
  sitePageEditorPath,
  sitePagePreviewPath,
  type PageStatus,
  type SitePageKey,
} from "@repo/db/server";
import { Footer } from "../_components/Footer";
import { SiteHeader } from "../_components/SiteHeader";
import { PreviewBar } from "../_components/PreviewBar";
import { fontVars } from "../_home/fonts";
import { headerDestinations } from "../_lib/locations";

/** Where a site page stands. */
type SitePageStanding = { page: SitePageKey; status: PageStatus };

/**
 * What the site's own pages share: the home page's type and palette, the
 * header, and the footer, its draft on a staff preview. `overlay` floats
 * the header over the home page's hero. `preview` is the page a staff
 * preview shows, and floats the preview bar over it: where the page
 * stands, its editor, and the way to every site page, `pages`, each with
 * where it stands.
 */
export async function SiteFrame({
  overlay = false,
  preview,
  children,
}: {
  overlay?: boolean;
  preview?: SitePageStanding & { pages: readonly SitePageStanding[] };
  children: ReactNode;
}) {
  return (
    <div
      className={`${fontVars} min-h-screen bg-canvas font-sans leading-normal text-body antialiased`}
    >
      <SiteHeader overlay={overlay} destinations={await headerDestinations()} />
      {children}
      <Footer preview={preview !== undefined} />
      {preview && (
        <PreviewBar
          name={SITE_PAGE_LABELS[preview.page]}
          standing={preview.status}
          editHref={`${ADMIN_URL}${sitePageEditorPath(preview.page)}`}
          title="Site pages"
          searchLabel="Find a site page"
          groups={preview.pages.map(({ page, status }) => ({
            href: sitePagePreviewPath(page),
            name: SITE_PAGE_LABELS[page],
            standing: status,
            current: page === preview.page,
            children: [],
          }))}
        />
      )}
    </div>
  );
}
