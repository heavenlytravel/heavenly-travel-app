import { notFoundMetadata, PageNotFound } from "../_site/PageNotFound";

export const metadata = notFoundMetadata;

/**
 * A booking or account page's `notFound()`, a search for a category the
 * site has not, say: in the layout's frame and column, which hold the
 * header and the footer already.
 */
export default function SiteNotFound() {
  return <PageNotFound />;
}
