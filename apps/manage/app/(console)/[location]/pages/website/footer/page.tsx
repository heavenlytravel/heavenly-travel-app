import { FOOTER_KEY } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";
import { FooterEditorScreen } from "../../_components/footer/FooterEditorScreen";

/**
 * Route: /~/pages/website/footer. The editor of the footer every page of
 * the customer site ends with (FooterEditorScreen). Console-wide: under a
 * slug it is not found. Marketing's and SEO's (`website.manage`).
 */
export default async function WebsiteFooterPage({
  params,
}: PageProps<"/[location]/pages/website/footer">) {
  await requireAdmin("website.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  return <FooterEditorScreen footerKey={FOOTER_KEY} />;
}
