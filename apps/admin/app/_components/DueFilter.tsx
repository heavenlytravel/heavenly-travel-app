import { FilterLinks } from "./FilterLinks";

const OPTIONS = [{ value: "due", label: "Documents due" }] as const;

/**
 * Narrows a list of vehicles or drivers to those with a document due
 * within 30 days or expired, or back to all. `hrefOf` names the list with
 * the choice in its address.
 */
export function DueFilter({
  due,
  hrefOf,
}: {
  due: boolean;
  hrefOf: (due: boolean) => string;
}) {
  return (
    <FilterLinks
      label="Filter by documents"
      options={OPTIONS}
      active={due ? "due" : undefined}
      hrefOf={(value) => hrefOf(value === "due")}
    />
  );
}
