import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@repo/ui/clerk-appearance";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "Heavenly Travel Admin",
  description: "Internal operations for Heavenly Travel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body className={GeistSans.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
