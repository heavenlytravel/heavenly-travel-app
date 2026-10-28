import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@repo/ui/clerk-appearance";
import { Toaster } from "@repo/ui/toast";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "Heavenly Travel Connect",
  description:
    "Jobs and trip reports for Heavenly Travel's vendors and drivers",
  appleWebApp: { title: "HT Connect", capable: true },
};

export const viewport: Viewport = { themeColor: "#0b2a4a" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body className={GeistSans.className}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
