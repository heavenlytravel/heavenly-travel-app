import type { Metadata } from "next";
import { pageColumn, Stop } from "./(site)/_components/Page";
import { SiteFrame } from "./_site/SiteFrame";

export const metadata: Metadata = {
  title: "We can't find that page | Heavenly Travel",
};

/**
 * What an address with no page shows, a link that is old or mistyped, and
 * every `notFound()` of the site: in the site's frame, its header and
 * footer, so the way on is in reach, with a way home.
 */
export default function NotFound() {
  return (
    <SiteFrame>
      <main className={pageColumn}>
        <Stop
          level={1}
          title="We can't find that page"
          message="The link may be old, or the address mistyped."
          href="/"
          linkLabel="Go to the home page"
        />
      </main>
    </SiteFrame>
  );
}
