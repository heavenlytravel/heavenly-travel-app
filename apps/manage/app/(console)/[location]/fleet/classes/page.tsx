import Link from "next/link";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { PageHeader } from "@repo/console/PageHeader";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { newClassHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { Catalogue } from "./_catalogue/Catalogue";
import { Offerings } from "./_offerings/Offerings";

/**
 * Route: /[location]/fleet/classes. Under `~` the class catalogue: what
 * each class is, wherever it is sold. Under a location what it sells, and
 * at what rates is on Rates; a draft location's step of the setup. Both
 * by category, a card per class. Operation adds and changes them
 * (`coverage.manage`); Reservation and Sales read them (`coverage.view`).
 */
export default async function ClassesPage({
  params,
}: PageProps<"/[location]/fleet/classes">) {
  await requireAdmin("coverage.view");
  const scope = await scopeOf(params);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader
        title="Classes"
        action={
          manages ? (
            <Button asChild>
              <Link href={newClassHref(scope.slug)}>
                <PlusIcon />
                Add class
              </Link>
            </Button>
          ) : null
        }
      />
      {scope.location ? (
        <Offerings location={scope.location} manages={manages} />
      ) : (
        <Catalogue manages={manages} />
      )}
    </>
  );
}
