import Link from "next/link";

const LINK = "font-medium text-slate-600 underline-offset-4 hover:underline";

/**
 * The way between the pages of a history read newest first: back to the
 * newest once past the first page, and on to the older changes while
 * there are more. Nothing when the history fits one page. The Activity
 * screen and a location's History read it.
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
      className="mt-4 flex items-center justify-between text-sm"
    >
      {newestHref ? (
        <Link href={newestHref} className={LINK}>
          Newest
        </Link>
      ) : (
        <span />
      )}
      {olderHref ? (
        <Link href={olderHref} className={LINK}>
          Older changes
        </Link>
      ) : null}
    </nav>
  );
}
