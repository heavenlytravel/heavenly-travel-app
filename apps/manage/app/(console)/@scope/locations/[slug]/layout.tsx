import { LocationScope } from "../../_components/ScopeNav";

/**
 * The sidebar's scope inside a location: its sections. A layout, so a
 * move between the location's tabs keeps the menu and reads it again
 * only when an action changes the location.
 */
export default async function LocationScopeLayout({
  params,
  children,
}: LayoutProps<"/locations/[slug]">) {
  const { slug } = await params;
  return (
    <>
      <LocationScope slug={slug} />
      {children}
    </>
  );
}
