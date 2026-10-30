import Link from "next/link";
import { formatLocalDate, fullName, plural, searchTermOf } from "@repo/db";
import { listUsers } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import { Pager, pageOf } from "../../../../_components/Pager";
import { SearchBox } from "../../../../_components/SearchBox";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  PAGE_PARAM,
  SEARCH_PARAM,
  customersHref,
  staffHref,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { PromoteButton } from "../PromoteButton";
import { CreateUserForm } from "./CreateUserForm";

const PAGE_SIZE = 50;

/**
 * Route: /~/team/customers?q=…&page=2. Every account, made on the site or
 * created here, the newest first, narrowed by a search of names and
 * emails; a customer promoted to staff from their row, an account created
 * on someone's behalf, made staff in the same go by an admin who manages
 * staff. Console-wide: under a slug it is not found. SUPER only.
 */
export default async function CustomersPage({
  params,
  searchParams,
}: PageProps<"/[location]/team/customers">) {
  await requireAdmin("users.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  const page = pageOf(query[PAGE_PARAM]);
  const permissions = await getPermissions();

  return (
    <>
      <PageHeader
        title="Customers"
        action={
          <CreateUserForm
            mayMakeStaff={permissions.includes("admins.manage")}
          />
        }
      />
      <Streamed fallback={<TableSkeleton columns={5} rows={8} />}>
        {() => customersList({ q, page })}
      </Streamed>
    </>
  );
}

/** One page of the accounts, or of those the search finds. */
async function customersList({ q, page }: { q?: string; page: number }) {
  const { users, total } = await listUsers({
    search: q,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <Card flush>
      <CardTitle
        inset
        meta={plural(total, "account")}
        action={
          <SearchBox
            href={customersHref()}
            value={q ?? ""}
            label="Search customers"
            placeholder="Name or email"
          />
        }
      >
        Every account
      </CardTitle>
      <Table bare>
        <THead>
          <Th>Name</Th>
          <Th>Phone</Th>
          <Th>Joined</Th>
          <Th>Access</Th>
          <Th />
        </THead>
        <TBody>
          {users.length === 0 ? (
            <EmptyRow colSpan={5}>
              {total > 0
                ? "No accounts on this page."
                : q
                  ? `No account matches “${q}”.`
                  : "No accounts yet."}
            </EmptyRow>
          ) : null}
          {users.map((user) => {
            const level = user.adminProfile?.level;
            return (
              <tr key={user.id}>
                <Td className="min-w-56">
                  <TwoLines top={fullName(user) || "—"} bottom={user.email} />
                </Td>
                <Td className="whitespace-nowrap text-muted tabular-nums">
                  {user.phone ?? "—"}
                </Td>
                <Td className="whitespace-nowrap text-muted tabular-nums">
                  {formatLocalDate(user.createdAt)}
                </Td>
                <Td>
                  {level ? (
                    <Badge tone={level === "SUPER" ? "brand" : "neutral"}>
                      {level}
                    </Badge>
                  ) : (
                    <span className="text-muted">Customer</span>
                  )}
                </Td>
                <Td className="text-right">
                  {level ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={staffHref(user.email)}>Manage</Link>
                    </Button>
                  ) : (
                    <PromoteButton email={user.email} />
                  )}
                </Td>
              </tr>
            );
          })}
        </TBody>
      </Table>
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hrefOf={(next) => customersHref({ q, page: next })}
      />
    </Card>
  );
}
