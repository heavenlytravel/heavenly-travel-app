import type { ReactNode } from "react";

/** The column a console page is read in: centred, no wider than a form reads well at. */
export function PageColumn({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 md:px-10 md:pt-10">
        {children}
      </div>
    </div>
  );
}
