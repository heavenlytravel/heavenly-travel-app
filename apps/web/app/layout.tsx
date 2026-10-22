import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@repo/ui/clerk-appearance";
import { NavigationProgress } from "@repo/ui/navigation-progress";
import { fontVars } from "./_home/fonts";

export const metadata: Metadata = {
  title: "Heavenly Travel",
  description:
    "Coach charter and cars with driver across Malaysia, based in Langkawi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        {/* The site's fonts on the body too, for what opens over the page. */}
        <body className={`${fontVars} font-(family-name:--font-body)`}>
          {/* The line along the top while a link opens the next page. */}
          <NavigationProgress
            className="fixed inset-x-0 top-0 z-50"
            gradient={["var(--brand)", "var(--azure)"]}
          />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
