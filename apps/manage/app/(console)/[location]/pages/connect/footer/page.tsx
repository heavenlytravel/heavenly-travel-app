import { CONNECT_FOOTER_KEY } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";
import { FooterEditorScreen } from "../../_components/footer/FooterEditorScreen";

/**
 * Route: /~/pages/connect/footer. The editor of the footer Connect's
 * landing page ends with (FooterEditorScreen): the website's, while "Use
 * same as Website footer" is on, else its own. Console-wide: under a slug
 * it is not found. Marketing's and SEO's (`website.manage`).
 */
export default async function ConnectFooterPage({
  params,
}: PageProps<"/[location]/pages/connect/footer">) {
  await requireAdmin("website.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  return <FooterEditorScreen footerKey={CONNECT_FOOTER_KEY} />;
}
