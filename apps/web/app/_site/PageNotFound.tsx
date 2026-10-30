import type { Metadata } from "next";
import { Stop } from "../(site)/_components/Page";

/** The browser tab's title while a page is not found. */
export const notFoundMetadata: Metadata = {
  title: "We can't find that page | Heavenly Travel",
};

/**
 * What a page not found says, a link that is old or mistyped, with a way
 * home: the body alone, for whichever frame it is in. The site's 404s draw
 * it in their own place: the root's in the site's frame, a booking page's
 * and a location page's in the frame their layout already draws, so the
 * header and the footer show once.
 */
export function PageNotFound() {
  return (
    <Stop
      level={1}
      title="We can't find that page"
      message="The link may be old, or the address mistyped."
      href="/"
      linkLabel="Go to the home page"
    />
  );
}
