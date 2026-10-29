"use client";

import Link from "next/link";
import { primaryButton, Stop } from "../(site)/_components/Page";
import { Logo } from "./Brand";

/**
 * A calm page for an error that kept a page from drawing, in place of the
 * browser's bare "Application error": the logo, which goes home, what
 * happened, and "Try again", `onRetry`. The error boundary shows it under
 * the site's own document; the one for the root layout in a document of
 * its own.
 */
export function ErrorNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-5 py-16">
      <div className="grid w-full max-w-[560px] justify-items-center gap-8">
        <Link href="/" aria-label="Heavenly Travel home" className="focus-ring">
          <Logo className="h-10 w-auto" loading="eager" />
        </Link>
        <Stop
          level={1}
          title="Something went wrong"
          message="This page could not load. Try again, or come back in a minute."
          action={
            <button
              type="button"
              onClick={onRetry}
              className={`${primaryButton} mt-6`}
            >
              Try again
            </button>
          }
        />
      </div>
    </main>
  );
}
