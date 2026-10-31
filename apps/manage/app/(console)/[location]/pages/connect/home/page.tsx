import { CONNECT_PAGE } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";
import { SitePageEditorScreen } from "../../_components/SitePageEditorScreen";

/**
 * Route: /~/pages/connect/home. The editor of Connect's landing page, what
 * a visitor signed out reads at Connect's `/` (SitePageEditorScreen). It
 * opens on the words it was built with until it is first saved, and stays
 * published once it is. Connect's other pages, when it has some, sit
 * beside it. Console-wide: under a slug it is not found. Marketing's and
 * SEO's (`website.manage`).
 */
export default async function ConnectHomeEditorPage({
  params,
}: PageProps<"/[location]/pages/connect/home">) {
  await requireAdmin("website.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  return <SitePageEditorScreen page={CONNECT_PAGE} />;
}
