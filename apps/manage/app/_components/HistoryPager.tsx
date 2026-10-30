import { PagerNav } from "./Pager";

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
    <PagerNav
      links={[
        { label: "Newest", href: newestHref },
        { label: "Older changes", href: olderHref },
      ]}
    />
  );
}
