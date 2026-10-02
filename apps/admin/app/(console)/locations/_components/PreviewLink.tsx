import type { LocationPageKey } from "@repo/db";
import { Button } from "@repo/ui/button";
import { locationPreviewUrl } from "../../../_lib/site";

/**
 * Opens a page of a location as staff preview it on the customer site: the
 * saved draft, whatever the location's state and the page's switch say. A
 * plain link in a new tab; the customer site checks `locations.manage`.
 */
export function PreviewLink({
  slug,
  page,
  label = "Preview",
}: {
  slug: string;
  /** The landing page when left out. */
  page?: LocationPageKey;
  label?: string;
}) {
  return (
    <Button asChild variant="secondary">
      <a href={locationPreviewUrl(slug, page)} target="_blank" rel="noreferrer">
        {label}
      </a>
    </Button>
  );
}
