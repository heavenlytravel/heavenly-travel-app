import { pageColumn } from "./(site)/_components/Page";
import { notFoundMetadata, PageNotFound } from "./_site/PageNotFound";
import { SiteFrame } from "./_site/SiteFrame";

export const metadata = notFoundMetadata;

/**
 * What an address with no page shows, and a `notFound()` outside a frame
 * of the site's (a location no one may see, say): in the site's frame, its
 * header and footer, so the way on is in reach. A `notFound()` inside a
 * booking page or a location's page has its own, in the frame its layout
 * draws: `(site)/not-found.tsx`, `(location)/[location]/not-found.tsx`.
 */
export default function NotFound() {
  return (
    <SiteFrame>
      <main className={pageColumn}>
        <PageNotFound />
      </main>
    </SiteFrame>
  );
}
