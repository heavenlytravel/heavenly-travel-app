import { UserButton } from "@clerk/nextjs";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import Link from "next/link";
import type { ReactNode } from "react";

/** A vendor's pages, for its owner and staff: the work, its fleet, and for the owner its staff. */
const MEMBER_LINKS = [
  { href: "/", label: "Work" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/drivers", label: "Drivers" },
  { href: "/staff", label: "Staff", owner: true },
] as const;

/**
 * Every Connect page: a slim header with the app's name and the account's
 * menu, then the page in one column sized for a phone. No sidebar: a
 * driver has a list and a job. A vendor's member (`member`) has a row
 * of its pages under the header.
 */
export function ConnectShell({
  children,
  member,
}: {
  children: ReactNode;
  member?: { vendorName: string; owner: boolean };
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="font-semibold tracking-tight">
            Heavenly Travel Connect
          </Link>
          <UserButton appearance={clerkUserButton} />
        </div>
        {member ? (
          <nav
            aria-label={member.vendorName}
            className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-4 pb-2"
          >
            {MEMBER_LINKS.filter(
              (link) => !("owner" in link) || member.owner,
            ).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <main className="mx-auto grid max-w-2xl gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
