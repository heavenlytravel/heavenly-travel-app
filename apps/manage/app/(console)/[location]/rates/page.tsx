import { redirect } from "next/navigation";
import { ratesHref, scopeSlugOf } from "../../../_lib/routes";

/**
 * Route: /[location]/rates. Rates is four pages, each its own address;
 * the section itself opens on the first, Classes and hourly, in the same
 * scope. That page checks access.
 */
export default async function RatesPage({
  params,
}: PageProps<"/[location]/rates">) {
  redirect(ratesHref(scopeSlugOf((await params).location), "classes"));
}
