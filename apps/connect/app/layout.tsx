import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@repo/ui/clerk-appearance";
import { cx } from "@repo/ui/cx";
import { Toaster } from "@repo/ui/toast";
import { fontVars } from "./fonts";

export const metadata: Metadata = {
  title: "Heavenly Travel Connect",
  description:
    "Jobs and trip reports for Heavenly Travel's vendors and drivers",
  appleWebApp: {
    title: "HT Connect",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // The brand's navy (--navy): where the band every screen opens on starts.
  themeColor: "#003876",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        data-app="console"
        // The landing page's links to its parts glide; a route change jumps.
        data-scroll-behavior="smooth"
        className={cx(fontVars, "motion-safe:scroll-smooth")}
      >
        <body>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
