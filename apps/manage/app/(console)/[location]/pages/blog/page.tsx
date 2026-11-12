import { isPageFilter, searchTermOf } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../_lib/access";
import { SEARCH_PARAM } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { BlogScreen } from "./_components/BlogScreen";

/**
 * Route: /~/pages/blog?status=…&q=…. The site's blog: its highlighted
 * posts, then every post, each opening its editor at /~/pages/blog/[id].
 * Console-wide: under a slug it is not found. The locations' pages' team
 * writes the posts (`pages.manage`).
 */
export default async function BlogPage({
  params,
  searchParams,
}: PageProps<"/[location]/pages/blog">) {
  await requireAdmin("pages.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  return (
    <BlogScreen
      status={isPageFilter(query.status) ? query.status : undefined}
      q={searchTermOf(query[SEARCH_PARAM]) ?? undefined}
    />
  );
}
