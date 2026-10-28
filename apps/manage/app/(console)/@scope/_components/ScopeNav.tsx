import { ConsoleMenu } from "../../../_components/ConsoleMenu";
import { allLocationsMenu } from "../../../_components/nav";
import { ScopeNavSkeleton, Streamed } from "../../../_components/Skeleton";
import { getPermissions } from "../../../_lib/access";
import { LocationScopeNav } from "../../locations/[slug]/LocationNav";

/**
 * What the `@scope` slot puts in the sidebar, by the page on screen: a
 * location's menu inside the location, the menu of All locations
 * everywhere else. See docs/261023-console-sidebar.md.
 */

/** The sidebar on All locations. */
export async function AllScopeNav() {
  return <ConsoleMenu menu={allLocationsMenu(await getPermissions())} />;
}

/** A location's menu, a skeleton of it while it loads. */
export function LocationScope({ slug }: { slug: string }) {
  return (
    <Streamed fallback={<ScopeNavSkeleton />}>
      {() => LocationScopeNav({ slug })}
    </Streamed>
  );
}
