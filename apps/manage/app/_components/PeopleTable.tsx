import Link from "next/link";
import type { ReactNode } from "react";
import type { ScopeSlug } from "../_lib/routes";
import { AddedTd, AddedTh, type MadeSort } from "./AddedColumn";
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

/** What a row of the table reads of a driver or a tour guide. */
type Person = {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  vendor: { isOurs: boolean; name: string };
  location: { name: string };
};

/** A column of the person's own: its heading, its cell, and the cell's class. */
type Column<P> = {
  heading: string;
  cell: (person: P) => ReactNode;
  className: string;
};

/**
 * A vendor's people as a table, in the scope on screen, the drivers' and
 * the tour guides' alike: the name and phone (and the vendor, when not
 * ours), the table's own columns, `lead` before the location under `~`
 * and `trail` after it, when each was added where the list sorts by it
 * (`sort`), and whether they are active. Each opens in the scope it was
 * listed in. `bare` is for a `flush` card.
 */
export function PeopleTable<P extends Person>({
  people,
  scope,
  hrefOf,
  heading,
  lead,
  trail = [],
  sort,
  bare = false,
  emptyMessage,
}: {
  people: readonly P[];
  scope: ScopeSlug;
  hrefOf: (scope: ScopeSlug, id: string) => string;
  /** The first column's heading: "Driver", "Tour guide". */
  heading: string;
  lead: readonly Column<P>[];
  trail?: readonly Column<P>[];
  sort?: MadeSort;
  bare?: boolean;
  emptyMessage: string;
}) {
  const showLocation = scope === null;
  const columns =
    2 + lead.length + trail.length + Number(showLocation) + Number(!!sort);
  const cells = (person: P, list: readonly Column<P>[]) =>
    list.map((column) => (
      <Td key={column.heading} className={column.className}>
        {column.cell(person)}
      </Td>
    ));
  return (
    <Table bare={bare}>
      <THead>
        <Th>{heading}</Th>
        {lead.map((column) => (
          <Th key={column.heading}>{column.heading}</Th>
        ))}
        {showLocation ? <Th>Location</Th> : null}
        {trail.map((column) => (
          <Th key={column.heading}>{column.heading}</Th>
        ))}
        {sort ? <AddedTh sort={sort} /> : null}
        <Th>Status</Th>
      </THead>
      <TBody>
        {people.length === 0 ? (
          <EmptyRow colSpan={columns}>{emptyMessage}</EmptyRow>
        ) : (
          people.map((person) => (
            <tr key={person.id}>
              <Td className="whitespace-nowrap">
                <TwoLines
                  top={
                    <Link
                      href={hrefOf(scope, person.id)}
                      className="underline-offset-4 hover:underline"
                    >
                      {person.name}
                    </Link>
                  }
                  bottom={
                    <>
                      <span className="tabular-nums">{person.phone}</span>
                      {person.vendor.isOurs ? null : ` · ${person.vendor.name}`}
                    </>
                  }
                />
              </Td>
              {cells(person, lead)}
              {showLocation ? (
                <Td className="whitespace-nowrap">{person.location.name}</Td>
              ) : null}
              {cells(person, trail)}
              {sort ? <AddedTd at={person.createdAt} /> : null}
              <Td className="whitespace-nowrap">
                <ServiceBadge
                  active={person.isActive}
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
