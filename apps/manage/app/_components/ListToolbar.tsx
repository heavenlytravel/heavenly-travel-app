import type { ReactNode } from "react";

/** The bar across the top of a list's card: its search and its filters. */
export function ListToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4">
      {children}
    </div>
  );
}
