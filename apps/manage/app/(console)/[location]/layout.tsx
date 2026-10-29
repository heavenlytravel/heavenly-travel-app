import { ConsoleShell } from "../../_components/ConsoleShell";
import { scopeOf } from "../../_lib/scope";

/**
 * Every console screen is under this one segment, the location: `~` for
 * every location the person may see, a slug for that location alone. The
 * layout reads the scope off it, a slug no location has being a page not
 * found, and draws the console's chrome round the page. See
 * docs/261029-manage-signature-overhaul.md, "Addresses".
 */
export default async function LocationLayout({
  params,
  children,
}: LayoutProps<"/[location]">) {
  const scope = await scopeOf(params);
  return <ConsoleShell scope={scope}>{children}</ConsoleShell>;
}
