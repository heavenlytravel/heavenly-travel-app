"use client";

import { ErrorNotice } from "./_components/ErrorNotice";

/**
 * What a page that failed shows, for every page of the site: a calm page
 * with the logo and "Try again", which asks the server for the page again
 * (`retry`, not `reset`, which would draw the same failed page anew).
 */
export default function PageError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorNotice onRetry={retry} />;
}
