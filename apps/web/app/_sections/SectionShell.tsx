import type { ReactNode } from "react";
import type { PageSection } from "@repo/db";
import { HomeSectionHeading } from "../_components/page-headings";
import { Section } from "../_components/page-parts";

/** Where the sections stand: the home page's centred band, or a hub's column. */
export type SectionLook = "home" | "hub";

/**
 * One section's frame under its heading, as Marketing wrote it: on the
 * home page centred, as its sections have always been; on a hub in the
 * column of its other parts, the lead under the title.
 */
export function SectionShell({
  look,
  id,
  section,
  children,
}: {
  look: SectionLook;
  /** The section's id; its title's is `${id}-title`. */
  id: string;
  section: PageSection;
  children: ReactNode;
}) {
  if (look === "home") {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="scroll-mt-8 px-4 pt-[75px] text-center sm:px-[clamp(20px,4vw,70px)] sm:pt-[105px]"
      >
        <HomeSectionHeading
          id={`${id}-title`}
          eyebrow={section.eyebrow}
          lead={section.lead}
        >
          {section.title}
        </HomeSectionHeading>
        {children}
      </section>
    );
  }
  return (
    <Section
      id={id}
      eyebrow={section.eyebrow || undefined}
      title={section.title}
    >
      {section.lead && (
        <p className="-mt-3 mb-8 max-w-[60ch] text-lead text-muted">
          {section.lead}
        </p>
      )}
      {children}
    </Section>
  );
}
