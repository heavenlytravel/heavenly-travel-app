import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";

/** A white panel with a border, the console's unit of layout. */
export function Card({
  id,
  className,
  children,
}: {
  /** Names the card in the page's address, so a link can land on it. */
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cx(
        "rounded-lg border border-neutral-200 bg-white p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  description,
}: {
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {description ? (
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      ) : null}
    </div>
  );
}
