import { UserButton } from "@clerk/nextjs";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import { SidebarNav } from "../_components/SidebarNav";

// Chrome only. Access is checked by each page with `requireAdmin`, which
// redirects before anything here reaches the browser.
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:px-4 md:py-6">
        <p className="px-3 text-sm font-semibold tracking-tight">
          Heavenly Travel
          <span className="ml-1.5 font-normal text-neutral-500">Admin</span>
        </p>
        <div className="md:mt-6 md:flex-1">
          <SidebarNav />
        </div>
        <div className="md:px-3">
          <UserButton appearance={clerkUserButton} />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 md:px-10 md:pt-10">
        {children}
      </main>
    </div>
  );
}
