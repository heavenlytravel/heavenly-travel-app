import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { CONNECT_PAGE, sitePageFallbackTitle } from "@repo/db";
import { Landing } from "./_landing/Landing";
import { landingData } from "./_landing/landing-data";

/** The landing page's search title and description. */
export async function generateMetadata(): Promise<Metadata> {
  const { content } = await landingData("public");
  return {
    title: content.metaTitle || sitePageFallbackTitle(CONNECT_PAGE),
    description: content.metaDescription,
  };
}

/**
 * Route: /. Connect's landing page, for everyone; someone signed in finds
 * the way into Connect, `/~`, in its header. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Connect".
 */
export default async function LandingPage() {
  const { userId } = await auth();
  return (
    <Landing {...await landingData("public")} signedIn={userId !== null} />
  );
}
