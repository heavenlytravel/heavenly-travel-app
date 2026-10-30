import { pageColumn } from "../../(site)/_components/Page";
import { notFoundMetadata, PageNotFound } from "../../_site/PageNotFound";

export const metadata = notFoundMetadata;

/**
 * A location's page that is not there, or not public, as its page's
 * `notFound()` says it: in the location's frame, which holds the header
 * and the footer already, in the site's column. A location no one may see
 * is the layout's own `notFound()`, which the root's 404 draws.
 */
export default function LocationNotFound() {
  return (
    <div className={pageColumn}>
      <PageNotFound />
    </div>
  );
}
