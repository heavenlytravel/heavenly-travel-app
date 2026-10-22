import { cookies } from "next/headers";
import { AllLocationsMenu } from "../../../_components/AppSidebar";
import { ScopeNavSkeleton, Streamed } from "../../../_components/Skeleton";
import { getPermissions } from "../../../_lib/access";
import { SCOPE_COOKIE, scopeOfKey } from "../../../_lib/routes";
import { LocationScopeNav } from "../../locations/[slug]/LocationNav";

/**
 * What the `@scope` slot puts in the sidebar, by the page on screen: a
 * location's sections inside the location, the views across locations on
 * the home and those views' own pages. A page of the whole console has no
 * route in the slot, so a move to it keeps the menu on screen; opened
 * afresh it shows the scope its cookie remembers. See
 * docs/261022-console-scope.md.
 */

/** The sidebar on All locations. */
export async function AllScopeNav() {
  return <AllLocationsMenu permissions={await getPermissions()} />;
}

/** A location's sections, a skeleton of them while they load. */
export function LocationScope({ slug }: { slug: string }) {
  return (
    <Streamed fallback={<ScopeNavSkeleton />}>
      {() => LocationScopeNav({ slug })}
    </Streamed>
  );
}

/** The scope last worked in, as its cookie remembers it. */
export async function RememberedScopeNav() {
  const scope = scopeOfKey((await cookies()).get(SCOPE_COOKIE)?.value);
  return scope === "all" ? (
    <AllScopeNav />
  ) : (
    <LocationScope slug={scope.slug} />
  );
}
