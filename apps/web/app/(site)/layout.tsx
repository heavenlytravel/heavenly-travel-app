import type { ReactNode } from "react";
import { Toaster } from "@repo/ui/toast";
import { Footer } from "../_components/Footer";
import { SiteHeader } from "../_components/SiteHeader";
import { fontVars } from "../_home/fonts";
import { headerDestinations } from "../_lib/locations";

/**
 * Every customer page after the home page: booking and account. The home
 * page type and palette, the site header, one centred column, then the
 * footer, and the toasts that say a change went through. Each page
 * checks its own access.
 */
export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`${fontVars} min-h-screen bg-slate-50 font-(family-name:--font-body) leading-normal text-slate-900 antialiased`}
    >
      <SiteHeader destinations={await headerDestinations()} />
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-6 pb-24 sm:px-8 sm:pt-10">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
