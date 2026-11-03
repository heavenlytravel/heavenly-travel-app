import Link from "next/link";
import type { GuideWithVendor } from "@repo/db/server";
import { guideHref, type ScopeSlug } from "../_lib/routes";
import { ServiceBadge } from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";

/**
 * The tour guides as a table, in the scope on screen: the name and phone
 * (and the vendor, when not ours), the languages they guide in, the
 * location under `~`, and whether they are active. Each
 * opens in the scope it was listed in. `bare` is for a `flush` card.
 */
export function GuidesTable({
  guides,
  scope,
  bare = false,
  emptyMessage,
}: {
  guides: readonly GuideWithVendor[];
  scope: ScopeSlug;
  bare?: boolean;
  emptyMessage: string;
}) {
  const showLocation = scope === null;
  const columns = showLocation ? 4 : 3;
  return (
    <Table bare={bare}>
      <THead>
        <Th>Tour guide</Th>
        <Th>Languages</Th>
        {showLocation ? <Th>Location</Th> : null}
        <Th>Status</Th>
      </THead>
      <TBody>
        {guides.length === 0 ? (
          <EmptyRow colSpan={columns}>{emptyMessage}</EmptyRow>
        ) : (
          guides.map((guide) => (
            <tr key={guide.id}>
              <Td className="whitespace-nowrap">
                <TwoLines
                  top={
                    <Link
                      href={guideHref(scope, guide.id)}
                      className="underline-offset-4 hover:underline"
                    >
                      {guide.name}
                    </Link>
                  }
                  bottom={
                    <>
                      <span className="tabular-nums">{guide.phone}</span>
                      {guide.vendor.isOurs ? null : ` · ${guide.vendor.name}`}
                    </>
                  }
                />
              </Td>
              <Td className="min-w-40">{guide.languages.join(", ")}</Td>
              {showLocation ? (
                <Td className="whitespace-nowrap">{guide.location.name}</Td>
              ) : null}
              <Td className="whitespace-nowrap">
                <ServiceBadge
                  active={guide.isActive}
                  on="Active"
                  off="Inactive"
                />
              </Td>
            </tr>
          ))
        )}
      </TBody>
    </Table>
  );
}
