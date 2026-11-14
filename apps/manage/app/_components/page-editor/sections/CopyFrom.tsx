"use client";

import {
  copySectionItems,
  plural,
  sectionOfType,
  type CopyableSection,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { ChevronDownIcon } from "@repo/ui/icons";
import { Menu, MenuItem } from "@repo/ui/menu";
import { toast } from "@repo/ui/toast";
import type { OtherPageSections } from "./data";
import { formSectionOf, type FormSection, type FormSectionOf } from "./form";

/** What one item is called, for the menu and the toast. */
const ITEM: Record<CopyableSection, string> = {
  "trusted-by": "logo",
  testimonials: "quote",
};

const itemsOf = (section: { logos: unknown[] } | { quotes: unknown[] }) =>
  "logos" in section ? section.logos : section.quotes;

/**
 * "Copy From…": the other pages whose same section has logos or quotes,
 * from their saved drafts, each with how many. Picking one adds those this
 * section lacks after its own, up to its limit, and says how many came
 * over. A copy: editing it later changes this page only. Nothing shows
 * while no other page has any.
 */
export function CopyFrom({
  section,
  others,
  onCopy,
}: {
  section: FormSectionOf<CopyableSection>;
  others: readonly OtherPageSections[];
  onCopy: (section: FormSection) => void;
}) {
  const item = ITEM[section.type];
  const sources = others.flatMap((other) => {
    const from = sectionOfType(other.sections, section.type);
    return from && itemsOf(from).length > 0
      ? [{ label: other.label, from }]
      : [];
  });
  if (sources.length === 0) return null;

  function copy(from: (typeof sources)[number]["from"]) {
    const { section: copied, added, skipped } = copySectionItems(section, from);
    if (added === 0) {
      toast(
        `Nothing to add: every ${item} there is here already, or the list is full.`,
      );
      return;
    }
    onCopy(formSectionOf(copied));
    toast.success(
      `Added ${plural(added, item)}.${
        skipped > 0
          ? ` ${skipped} ${skipped === 1 ? "was" : "were"} here already or past the limit.`
          : ""
      } Save the draft to keep ${added === 1 ? "it" : "them"}.`,
    );
  }

  return (
    <Menu
      label="Copy from another page"
      trigger={
        <Button variant="secondary" size="sm">
          Copy From… <ChevronDownIcon />
        </Button>
      }
    >
      {sources.map(({ label, from }) => (
        <MenuItem key={label} onSelect={() => copy(from)}>
          {label}
          <span className="ml-auto text-xs text-muted tabular-nums">
            {plural(itemsOf(from).length, item)}
          </span>
        </MenuItem>
      ))}
    </Menu>
  );
}
