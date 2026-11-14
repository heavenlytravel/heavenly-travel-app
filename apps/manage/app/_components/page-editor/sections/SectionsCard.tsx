"use client";

import {
  SECTION_LABELS,
  missingInSections,
  pageSectionsOf,
  sectionHasItems,
  type PageKind,
} from "@repo/db";
import { Card, CardTitle } from "@repo/console/Card";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { ChevronDownIcon } from "@repo/ui/icons";
import { Switch } from "@repo/ui/switch";
import { useState, type ReactNode } from "react";
import { RowControls, movedRow } from "../../RowControls";
import type { SectionData } from "./data";
import type { FormSection } from "./form";
import { SectionFields } from "./SectionFields";

/**
 * The page's sections, between its hero and its intro, in the order the
 * page shows them: a row each with its name, whether it shows, up and
 * down, and Edit, which unfolds its fields in place, one at a time. A
 * section switched on with nothing in it is left out of the page; what a
 * section on still needs before a publish is counted on its row.
 */
export function SectionsCard({
  id,
  className,
  kind,
  sections,
  data,
  meta,
  onChange,
}: {
  /** Where "Go to It" lands. */
  id: string;
  className?: string;
  kind: PageKind;
  sections: readonly FormSection[];
  data: SectionData;
  /** What the card still needs, beside its name. */
  meta?: ReactNode;
  onChange: (sections: FormSection[]) => void;
}) {
  const [open, setOpen] = useState<FormSection["type"] | null>(null);
  // Each section as it would be stored: what its row's count reads.
  const stored = pageSectionsOf(kind, sections);

  const replace = (index: number, section: FormSection) =>
    onChange(sections.map((s, i) => (i === index ? section : s)));

  return (
    <Card>
      <div id={id} className={className}>
        <CardTitle meta={meta}>Sections</CardTitle>
        <p className="-mt-2 mb-4 text-caption text-muted">
          Between the hero and the intro, in this order. Switch a section on to
          show it; one with nothing in it stays hidden.
        </p>
        <ol className="divide-y divide-hairline">
          {sections.map((section, index) => {
            const label = SECTION_LABELS[section.type];
            const normal = stored.find((s) => s.type === section.type);
            const toDo = normal ? missingInSections(kind, [normal]).length : 0;
            const isOpen = open === section.type;
            const fieldsId = `${id}-${section.type}`;
            return (
              <li key={section.type} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Switch
                    checked={section.on}
                    onCheckedChange={(on) =>
                      replace(index, { ...section, on } as FormSection)
                    }
                    label={`Show ${label}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="text-xs text-muted">
                      {!section.on
                        ? "Hidden"
                        : normal && !sectionHasItems(normal)
                          ? "On, hidden until it has something in it"
                          : section.title || "Shown"}
                      {section.on && toDo > 0 ? (
                        <span className="font-semibold text-warning">
                          {" "}
                          · {toDo} to do before publishing
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <RowControls
                    name={label}
                    isFirst={index === 0}
                    isLast={index === sections.length - 1}
                    onMove={(by) => onChange(movedRow(sections, index, by))}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-expanded={isOpen}
                    aria-controls={fieldsId}
                    onClick={() => setOpen(isOpen ? null : section.type)}
                  >
                    {isOpen ? "Done" : "Edit"}
                    <ChevronDownIcon
                      className={cx(
                        "transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </Button>
                </div>
                {isOpen ? (
                  <div
                    id={fieldsId}
                    className="mt-4 rounded-card border border-hairline bg-shade/40 p-4"
                  >
                    <SectionFields
                      kind={kind}
                      section={section}
                      data={data}
                      onChange={(next) => replace(index, next)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
