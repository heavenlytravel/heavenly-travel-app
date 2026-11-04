import type { GuideWithVendor } from "@repo/db/server";
import { guideHref, type ScopeSlug } from "../_lib/routes";
import { PeopleTable } from "./PeopleTable";

/**
 * The tour guides as a table (./PeopleTable), with the languages they
 * guide in.
 */
export function GuidesTable({
  guides,
  ...table
}: {
  guides: readonly GuideWithVendor[];
  scope: ScopeSlug;
  bare?: boolean;
  emptyMessage: string;
}) {
  return (
    <PeopleTable
      {...table}
      people={guides}
      hrefOf={guideHref}
      heading="Tour guide"
      lead={[
        {
          heading: "Languages",
          cell: (guide) => guide.languages.join(", "),
          className: "min-w-40",
        },
      ]}
    />
  );
}
