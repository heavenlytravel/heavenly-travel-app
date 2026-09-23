import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { fontVars } from "../_home/fonts";
import { SiteHeader } from "./_components/SiteHeader";

/**
 * Every customer page after the home page: booking and account. The home
 * page type and palette, the site header, then one centred column. Each
 * page checks its own access; the header only needs to know whether a
 * session exists.
 */
export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();
  return (
    <div
      className={`${fontVars} min-h-screen bg-[#fbfcfa] font-(family-name:--font-body) leading-normal text-[#102825] antialiased`}
    >
      <SiteHeader signedIn={userId !== null} />
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-6 pb-24 sm:px-8 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
