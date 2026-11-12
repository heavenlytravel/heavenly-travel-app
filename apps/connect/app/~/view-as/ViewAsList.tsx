"use client";

import { isVendorStatus, VENDOR_STATUS_LABELS } from "@repo/db";
import type { ViewAsGroup } from "@repo/db/server";
import { Input } from "@repo/ui/field";
import { useDeferredValue, useState } from "react";
import { Panel } from "../../_ui/parts";
import { SubmitButton } from "../../_ui/SubmitButton";
import { startViewAsAction } from "./actions";

/** Whether a search matches the vendor's name or the person's name or email. */
function matches(query: string, ...texts: string[]) {
  return texts.some((text) => text.toLowerCase().includes(query));
}

/**
 * The accounts a SUPER may view as, by vendor, with a search over the
 * vendors' and the people's names and emails. Each row's View starts the
 * view at once.
 */
export function ViewAsList({
  groups,
  viewing,
}: {
  groups: ViewAsGroup[];
  /** The account viewed now, marked in its row. */
  viewing: string | null;
}) {
  const [query, setQuery] = useState("");
  const typed = useDeferredValue(query.trim().toLowerCase());
  const shown = groups
    .map((group) => ({
      ...group,
      people:
        !typed || matches(typed, group.vendor.name)
          ? group.people
          : group.people.filter((p) => matches(typed, p.name, p.email)),
    }))
    .filter((group) => group.people.length > 0);

  return (
    <>
      <Panel className="p-4">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a vendor, a name or an email"
          aria-label="Search"
        />
      </Panel>
      {shown.length === 0 ? (
        <Panel className="p-6">
          <p className="text-sm text-muted">
            {groups.length === 0
              ? "No one has a Connect account yet."
              : "No one matches."}
          </p>
        </Panel>
      ) : null}
      {shown.map(({ vendor, people }) => (
        <Panel key={vendor.id} as="div" className="overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-5 py-3">
            <h2 className="min-w-0 truncate text-sm font-semibold text-ink">
              {vendor.name}
            </h2>
            {vendor.status !== "active" ? (
              <span className="shrink-0 text-xs text-muted">
                {isVendorStatus(vendor.status)
                  ? VENDOR_STATUS_LABELS[vendor.status]
                  : vendor.status}
              </span>
            ) : null}
          </div>
          <ul className="divide-y divide-hairline">
            {people.map((person) => (
              <li
                key={person.userId}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-sm font-semibold text-ink">
                    {person.name}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {person.roles.join(", ")} · {person.email}
                  </span>
                </span>
                {person.userId === viewing ? (
                  <span className="shrink-0 text-xs font-semibold text-warning">
                    Viewing
                  </span>
                ) : (
                  <form action={startViewAsAction.bind(null, person.userId)}>
                    <SubmitButton variant="secondary" size="sm">
                      View
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
}
