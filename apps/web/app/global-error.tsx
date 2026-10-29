"use client";

import "@repo/ui/styles.css";
import "./globals.css";
import { ErrorNotice } from "./_components/ErrorNotice";
import { fontVars } from "./_home/fonts";

/**
 * What shows when the root layout itself fails: it stands in for the whole
 * document, so it brings its own `<html>`, the site's styles, fonts and
 * look (`data-app="site"`), and its own title.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" data-app="site">
      <body className={`${fontVars} font-sans`}>
        <title>Something went wrong | Heavenly Travel</title>
        <ErrorNotice onRetry={retry} />
      </body>
    </html>
  );
}
