import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@repo/ui/clerk-appearance";
import { Toaster } from "@repo/ui/toast";

/** The customer site's type, so the three apps read as one brand. */
const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-connect",
  display: "swap",
});

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
  // The brand's ink (--ink): the colour of the band every screen opens on.
  themeColor: "#00264b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className={sans.variable}>
        <body className="font-sans antialiased">
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
