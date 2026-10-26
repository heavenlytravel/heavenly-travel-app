import { SiteFooter } from "../_home/Sections";
import { topChoiceCards } from "../_lib/locations";
import { footerLinks } from "../_lib/site-pages";

/**
 * The footer with what it lists read for it, cached: the home page's top
 * choices and the company's pages that are published. Every marketing page
 * ends with it.
 */
export async function Footer() {
  const [destinations, links] = await Promise.all([
    topChoiceCards(),
    footerLinks(),
  ]);
  return <SiteFooter destinations={destinations} links={links} />;
}
