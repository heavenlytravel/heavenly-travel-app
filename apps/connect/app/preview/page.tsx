import type { Metadata } from "next";
import { CONNECT_PAGE_EDITOR_PATH } from "@repo/db";
import { ADMIN_URL, getAdminAccess } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { Landing } from "../_landing/Landing";
import { landingData } from "../_landing/landing-data";

export const metadata: Metadata = {
  title: "Preview | Connect",
  robots: { index: false, follow: false },
};

/**
 * Route: /preview. The landing page's draft, as the console's editor has
 * it, for staff who write it (`website.manage`), under a bar that says so
 * and leads back to the editor. Anyone else signed in finds nothing here;
 * someone signed out signs in first.
 */
export default async function PreviewPage() {
  const access = await getAdminAccess("website.manage");
  if (access.status === "signed-out")
    redirect("/sign-in?redirect_url=/preview");
  if (access.status !== "ok") notFound();
  const data = await landingData("draft");
  return (
    <Landing
      {...data}
      ribbon={
        <div className="bg-warning-soft text-warning-strong">
          <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm sm:px-8">
            <span>
              <strong>Preview of the draft.</strong> Visitors see the published
              page.
            </span>
            <a
              href={`${ADMIN_URL}${CONNECT_PAGE_EDITOR_PATH}`}
              className="font-semibold underline underline-offset-4 focus-ring"
            >
              Edit
            </a>
          </p>
        </div>
      }
    />
  );
}
