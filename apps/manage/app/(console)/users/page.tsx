import Link from "next/link";
import { formatLocalDate, fullName, searchTermOf } from "@repo/db";
import { listUsers } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { Pager, pageOf } from "../../_components/Pager";
import { SearchBox } from "../../_components/SearchBox";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { EmptyRow, Table, TBody, Td, Th, THead } from "@repo/console/Table";
import { requireAdmin } from "../../_lib/access";
import {
  adminHref,
  PAGE_PARAM,
  SEARCH_PARAM,
  usersHref,
} from "../../_lib/routes";
import { CreateUserForm } from "./CreateUserForm";
import { MakeAdminButton } from "./MakeAdminButton";

const PAGE_SIZE = 50;

/**
 * Route: /users?q=…&page=2. Every account, made on the site or created
 * here, the newest first, narrowed by a search of names and emails; a
 * customer made staff from their row, an account created on someone's
 * behalf. SUPER only.
 */
export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  await requireAdmin("users.manage");
  const params = await searchParams;
  const q = searchTermOf(params[SEARCH_PARAM]) ?? undefined;
  const page = pageOf(params[PAGE_PARAM]);

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account, whether they signed up on the site or were created here. Make one an admin from its row."
      />

      <CreateUserForm />

      <Streamed
        fallback={
          <div className="mt-6">
            <TableSkeleton columns={6} rows={8} />
          </div>
        }
      >
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
    <>
      <Card flush className="mt-6">
        <CardTitle
          inset
          action={
            <SearchBox
              href={usersHref()}
              value={q ?? ""}
              label="Search users"
              placeholder="Name or email"
            />
          }
        >
          Every user
        </CardTitle>
        <Table bare>
          <THead>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Joined</Th>
            <Th>Access</Th>
            <Th />
          </THead>
          <TBody>
            {users.length === 0 ? (
              <EmptyRow colSpan={6}>
                {total > 0
                  ? "No users on this page."
                  : q
                    ? `No user matches “${q}”.`
                    : "No users yet."}
              </EmptyRow>
            ) : null}
            {users.map((user) => {
              const level = user.adminProfile?.level;
              return (
                <tr key={user.id}>
                  <Td className="font-medium">{fullName(user) || "—"}</Td>
                  <Td className="text-slate-600">{user.email}</Td>
                  <Td className="text-slate-600 tabular-nums">
                    {user.phone ?? "—"}
                  </Td>
                  <Td className="text-slate-600 tabular-nums">
                    {formatLocalDate(user.createdAt)}
                  </Td>
                  <Td>
                    {level ? (
                      <Badge tone={level === "SUPER" ? "blue" : "neutral"}>
                        {level}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">Customer</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    {level ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={adminHref(user.email)}>Manage</Link>
                      </Button>
                    ) : (
                      <MakeAdminButton email={user.email} />
                    )}
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      </Card>
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hrefOf={(next) => usersHref({ q, page: next })}
      />
    </>
  );
}
