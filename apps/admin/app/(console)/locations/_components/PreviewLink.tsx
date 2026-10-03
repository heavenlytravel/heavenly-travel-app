import type { LocationPageKey } from "@repo/db";
import { Button } from "@repo/ui/button";
import { locationPreviewUrl } from "../../../_lib/site";

/**
 * Opens a page of a location as staff preview it on the customer site: the
 * saved draft, whatever the location's state and whether the page is
 * published. A plain link in a new tab; the customer site checks `locations.manage`.
 */
export function PreviewLink({
  slug,
  page,
}: {
  slug: string;
  /** The landing page when left out. */
  page?: LocationPageKey;
}) {
  return (
    <Button asChild variant="secondary">
      <a href={locationPreviewUrl(slug, page)} target="_blank" rel="noreferrer">
        Preview
      </a>
    </Button>
  );
}
