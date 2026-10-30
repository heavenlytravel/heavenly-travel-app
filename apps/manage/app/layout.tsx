import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@repo/ui/clerk-appearance";
import { fontVars } from "./fonts";

export const metadata: Metadata = {
  title: "Heavenly Travel Manage",
  description: "Internal operations for Heavenly Travel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" data-app="console" className={fontVars}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
