import type { ReactNode } from "react";

/**
 * Around a form shared with the admin (the vehicle, the driver, the
 * vendor's fields): its cards drawn as Connect's panels, rounder, lifted
 * off the mist, without the console's hairline edge.
 */
export function FormFrame({ children }: { children: ReactNode }) {
  return (
    <div className="connect-rise [&_section]:rounded-3xl [&_section]:border-0 [&_section]:shadow-[0_1px_2px_rgba(0,38,75,0.06),0_12px_32px_-16px_rgba(0,38,75,0.18)] [&_section]:ring-1 [&_section]:ring-slate-900/5">
      {children}
    </div>
  );
}
