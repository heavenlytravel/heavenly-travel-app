import type { PageSection } from "@repo/db";
import type { LinkChoices } from "../LinkTargetFields";

/** A vehicle class a section may show: its name, its service and whether it is on sale. */
export type SectionClass = {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
};

/** Another page's saved sections, which "Copy From…" offers. */
export type OtherPageSections = {
  /** "Car with Driver". */
  label: string;
  sections: readonly PageSection[];
};

/** What the sections' fields pick from, read on the server as the editor opens. */
export type SectionData = {
  /** Where a service card may lead. */
  choices: LinkChoices;
  /** The class catalogue. */
  classes: readonly SectionClass[];
  /** On a hub, the classes of its service only; null on the home page, every class. */
  classCategory: string | null;
  /** The other pages with sections, from their saved drafts. */
  others: readonly OtherPageSections[];
};
