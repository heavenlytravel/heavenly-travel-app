import { plural } from "@repo/db";
import { countPendingVendors } from "@repo/db/server";
import { ConsoleMenu } from "../../../_components/ConsoleMenu";
import { VENDORS_PATH } from "../../../_lib/routes";
import { allLocationsMenu } from "../../../_components/nav";
import { ScopeNavSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions } from "../../../_lib/access";
import { LocationScopeNav } from "../../locations/[slug]/LocationNav";

/**
 * What the `@scope` slot puts in the sidebar, by the page on screen: a
 * location's menu inside the location, the menu of All locations
 * everywhere else. See docs/261023-console-sidebar.md.
 */

/** The sidebar on All locations, with the vendors waiting for a SUPER's review on Vendors. */
export async function AllScopeNav() {
  const permissions = await getPermissions();
  const pending = permissions.includes("vendors.review")
    ? await countPendingVendors()
    : 0;
  return (
    <ConsoleMenu
      menu={allLocationsMenu(
        permissions,
        pending > 0
          ? {
              [VENDORS_PATH]: {
                value: pending,
                tone: "amber",
                label: `${plural(pending, "vendor")} waiting for approval`,
              },
            }
          : {},
      )}
    />
  );
}

/** A location's menu, a skeleton of it while it loads. */
export function LocationScope({ slug }: { slug: string }) {
  return (
    <Streamed fallback={<ScopeNavSkeleton />}>
      {() => LocationScopeNav({ slug })}
    </Streamed>
  );
}
