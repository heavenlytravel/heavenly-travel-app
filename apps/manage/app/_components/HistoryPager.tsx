import Link from "next/link";
import { Button } from "@repo/ui/button";

/**
 * The way between the pages of a history read newest first, across the
 * foot of its card (`HistoryTimeline`'s `foot`): back to the newest once
 * past the first page, and on to the older changes while there are more.
 * Nothing when the history fits one page. The Activity screen reads it.
 */
export function HistoryPager({
  newestHref,
  olderHref,
}: {
  /** The first page, when this is not it; null on the first page. */
  newestHref: string | null;
  /** The next, older page; null at the end. */
  olderHref: string | null;
}) {
  if (!newestHref && !olderHref) return null;
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-end gap-1.5 border-t border-hairline px-5 py-3"
    >
      {newestHref ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={newestHref}>Newest</Link>
        </Button>
      ) : null}
      {olderHref ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={olderHref}>Older changes</Link>
        </Button>
      ) : null}
    </nav>
  );
}
