import type { ReactNode } from "react";

/**
 * Around a form shared with the admin (the vehicle, the driver, the
 * vendor's fields): its cards are the console's, as Connect's own are, and
 * rise into place as the screen opens.
 */
export function FormFrame({ children }: { children: ReactNode }) {
  return <div className="connect-rise">{children}</div>;
}
