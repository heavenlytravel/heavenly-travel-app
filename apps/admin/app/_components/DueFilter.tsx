import { FilterLinks } from "./FilterLinks";

/**
 * Narrows a list of vehicles or drivers to those with a document due
 * within 30 days or expired, or back to all. `label` names the documents:
 * "Documents due" for vehicles, "Licences due" for drivers. `hrefOf`
 * names the list with the choice in its address.
 */
export function DueFilter({
  label,
  due,
  hrefOf,
}: {
  label: string;
  due: boolean;
  hrefOf: (due: boolean) => string;
}) {
  return (
    <FilterLinks
      label={`Filter by ${label.toLowerCase()}`}
      options={[{ value: "due", label }]}
      active={due ? "due" : undefined}
      hrefOf={(value) => hrefOf(value === "due")}
    />
  );
}
