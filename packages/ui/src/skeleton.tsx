import type { ReactNode } from "react";
import { cx } from "./cx.js";

/**
 * One grey bar in place of a line of text or a picture that is not there
 * yet. The class gives its size and room; a class may change its corners
 * too, as a picture's square ones.
 */
export function Bone({ className }: { className: string }) {
  return (
    <span className={cx("ui:block ui:rounded-md ui:bg-card-edge", className)} />
  );
}

/**
 * The shape of a part that is not read yet, built from `Bone`s at about
 * its height, so nothing below moves when it comes. Read out once as
 * "Loading", and it pulses unless the user asks for less motion.
 */
export function Loading({
  label = "Loading",
  className,
  children,
}: {
  /** What a screen reader says: "Loading" unless something more exact fits. */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cx("ui:motion-safe:animate-pulse", className)}
    >
      {children}
    </div>
  );
}
