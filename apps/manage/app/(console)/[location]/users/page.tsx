import Link from "next/link";
import { formatLocalDate, fullName, plural, searchTermOf } from "@repo/db";
import { listUsers } from "@repo/db/server";
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
import { Pager, pageOf } from "../../../_components/Pager";
import { SearchBox } from "../../../_components/SearchBox";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  PAGE_PARAM,
  SEARCH_PARAM,
  userHref,
  usersHref,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import { AdminAccess, ConnectAccess } from "./_components/Access";
import { CreateUserForm } from "./CreateUserForm";

const PAGE_SIZE = 50;

/**
 * Route: /~/users?q=…&page=2. All Users: every account in the system,
 * made on the website, in Connect or created here, the newest first,
 * narrowed by a search of names and emails. Each row says where the
 * account has access beyond the website, Manage and Connect, and opens
 * its page, where its profile, email and password are changed. An account
 * created on someone's behalf is made an admin in the same go by an admin
 * who manages admins. Console-wide: under a slug it is not found. SUPER
 * only.
 */
export default async function AllUsersPage({
  params,
  searchParams,
}: PageProps<"/[location]/users">) {
  await requireAdmin("users.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  const page = pageOf(query[PAGE_PARAM]);
  const permissions = await getPermissions();

  return (
    <>
      <PageHeader
        title="All Users"
        action={
          <CreateUserForm
            mayMakeStaff={permissions.includes("admins.manage")}
          />
        }
      />
      <Streamed fallback={<TableSkeleton columns={6} rows={8} />}>
        {() => usersList({ q, page })}
      </Streamed>
    </>
  );
}

/** One page of the accounts, or of those the search finds. */
async function usersList({ q, page }: { q?: string; page: number }) {
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
            href={usersHref()}
            value={q ?? ""}
            label="Search users"
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
          <Th>Admin</Th>
          <Th>Connect</Th>
          <Th>Joined</Th>
          <Th />
        </THead>
        <TBody>
          {users.length === 0 ? (
            <EmptyRow colSpan={6}>
              {total > 0
                ? "No accounts on this page."
                : q
                  ? `No account matches “${q}”.`
                  : "No accounts yet."}
            </EmptyRow>
          ) : null}
          {users.map((user) => (
            <tr key={user.id}>
              <Td className="min-w-56">
                <TwoLines top={fullName(user) || "—"} bottom={user.email} />
              </Td>
              <Td className="whitespace-nowrap text-muted tabular-nums">
                {user.phone ?? "—"}
              </Td>
              <Td>
                <AdminAccess profile={user.adminProfile} />
              </Td>
              <Td>
                <ConnectAccess user={user} />
              </Td>
              <Td className="whitespace-nowrap text-muted tabular-nums">
                {formatLocalDate(user.createdAt)}
              </Td>
              <Td className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={userHref(user.id)}>Open</Link>
                </Button>
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hrefOf={(next) => usersHref({ q, page: next })}
      />
    </Card>
  );
}
