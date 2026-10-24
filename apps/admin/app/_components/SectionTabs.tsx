import type { Permission } from "@repo/db";
import { LinkTabs } from "./LinkTabs";
import { viewsFor, type NavSection } from "./nav";

/**
 * The tabs of a section with more than one page, under its header: the
 * pages the admin may open, the one on screen marked. A section the admin
 * may open one page of has no tabs.
 */
export function SectionTabs({
  section,
  current,
  permissions,
}: {
  section: NavSection;
  /** The page on screen, by its address. */
  current: string;
  permissions: readonly Permission[];
}) {
  const views = viewsFor(section, permissions);
  if (views.length < 2) return null;
  return (
    <LinkTabs
      label={section.label}
      className="mt-6"
      tabs={views.map((view) => ({
        key: view.href,
        label: view.label,
        href: view.href,
        current: view.href === current,
      }))}
    />
  );
}
