"use client";

import { WhatsAppIcon } from "../../../_components/WhatsAppIcon";
import { useHeadcount } from "./HeadcountProvider";

/**
 * A WhatsApp link that carries the whole trip as it stands. Used in the
 * header and footer so every way out of the page sends the same message.
 */
export function QuoteLink({
  className,
  short = false,
}: {
  className?: string;
  short?: boolean;
}) {
  const { count, whatsappHref } = useHeadcount();
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <WhatsAppIcon className="h-4.5 w-4.5 shrink-0" />
      <span>
        {short ? "Quote" : "Get a quote"} for{" "}
        <span className="tabular-nums">{count}</span>
        <span className="sr-only"> on WhatsApp</span>
      </span>
    </a>
  );
}

/** Sets the head count from further down the page and returns to the plan. */
export function SetCountButton({
  to,
  className,
}: {
  to: number;
  className?: string;
}) {
  const { setCount } = useHeadcount();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        setCount(to);
        const still = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        document
          .getElementById("count")
          ?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
        document.getElementById("hc-range")?.focus({ preventScroll: true });
      }}
    >
      See the plan for {to}
    </button>
  );
}
