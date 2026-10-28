import { UserButton } from "@clerk/nextjs";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Every Connect page: a slim header with the app's name and the account's
 * menu, then the page in one column sized for a phone. No sidebar: a
 * driver has a list and a job.
 */
export function ConnectShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="font-semibold tracking-tight">
            Heavenly Travel Connect
          </Link>
          <UserButton appearance={clerkUserButton} />
        </div>
      </header>
      <main className="mx-auto grid max-w-2xl gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
