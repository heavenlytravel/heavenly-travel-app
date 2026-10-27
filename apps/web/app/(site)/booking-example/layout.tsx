import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@repo/ui/toast";
import { ExampleBar } from "./_example/ExampleBar";

export const metadata: Metadata = {
  title: "Booking example | Heavenly Travel",
  robots: { index: false },
};

/**
 * Route: /booking-example and its steps. A clickable example of booking
 * several trips in one go, with sample data and nothing saved, for the
 * team to try before the real flow is built. Not linked from the site.
 */
export default function BookingExampleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ExampleBar />
      {children}
      <Toaster />
    </>
  );
}
