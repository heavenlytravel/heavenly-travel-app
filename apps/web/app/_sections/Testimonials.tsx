import Image from "next/image";
import { paragraphsOf, type PageSectionOf } from "@repo/db";
import { SectionShell, type SectionLook } from "./SectionShell";

/**
 * What clients said, with their permission: a card each, the words under
 * a large quotation mark, then who said it, with their photo when there
 * is one. No stars, and nothing for search engines: reviews a business
 * shows of itself earn none. The first card is set in the brand's navy.
 */
export function Testimonials({
  look,
  section,
}: {
  look: SectionLook;
  section: PageSectionOf<"testimonials">;
}) {
  return (
    <SectionShell look={look} id="testimonials" section={section}>
      <ul className="mx-auto grid max-w-[1240px] gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {section.quotes.map((quote, i) => {
          const dark = i === 0;
          return (
            <li
              key={i}
              className={`flex flex-col rounded-card p-6 sm:p-7 ${
                dark
                  ? "bg-navy text-white"
                  : "border border-card-edge bg-white text-body"
              }`}
            >
              <figure className="flex flex-1 flex-col">
                <span
                  aria-hidden
                  className={`font-serif text-6xl leading-[0.6] ${dark ? "text-azure-light" : "text-brand"}`}
                >
                  “
                </span>
                <blockquote className="mt-4 grid flex-1 gap-3 text-lead leading-relaxed">
                  {paragraphsOf(quote.quote).map((paragraph, j) => (
                    <p key={j}>{paragraph}</p>
                  ))}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  {quote.image && (
                    <Image
                      src={quote.image.url}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 shrink-0 rounded-full object-cover"
                    />
                  )}
                  <span>
                    <strong
                      className={`block ${dark ? "text-white" : "text-ink"}`}
                    >
                      {quote.name}
                    </strong>
                    {quote.detail && (
                      <span
                        className={`block text-caption ${dark ? "text-white/75" : "text-muted"}`}
                      >
                        {quote.detail}
                      </span>
                    )}
                  </span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
