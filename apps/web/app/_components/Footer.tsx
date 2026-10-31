import { SiteFooter } from "@repo/console/SiteFooter";
import { shownFooter } from "../_lib/site-pages";
import { HomeLink } from "./Brand";

/**
 * The footer with what it shows read for it: the published footer, cached,
 * or on a staff preview its draft. Every page of the customer site ends
 * with it.
 */
export async function Footer({ preview = false }: { preview?: boolean }) {
  return (
    <SiteFooter
      content={await shownFooter(preview)}
      // The blue logo, drawn white on the blue.
      logo={<HomeLink tone="white" className="inline-block" />}
    />
  );
}
