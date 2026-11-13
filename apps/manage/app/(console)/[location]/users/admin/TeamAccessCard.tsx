"use client";

import {
  ADMIN_TEAMS,
  ADMIN_TEAM_LABELS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  TEAM_PERMISSIONS,
  VIEW_ONLY_PERMISSIONS,
  defaultTeamsOf,
  may,
  ruleField,
  SHOWN_RULES_FIELD,
  teamsOf,
  type AdminTeam,
  type Permission,
  type PermissionHolder,
  type RuleOverrides,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { useState } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { TBody, Td, Th, THead, Table } from "@repo/console/Table";
import { useActionForm } from "@repo/console/use-action-form";
import { setAccessRulesAction } from "./actions";

/** The table's columns: each team as the wall sees it, alone, then SUPER. */
const COLUMNS: readonly {
  key: AdminTeam | "SUPER";
  label: string;
  holder: PermissionHolder;
}[] = [
  ...ADMIN_TEAMS.map((team) => ({
    key: team,
    label: ADMIN_TEAM_LABELS[team],
    holder: { level: "REGULAR", teams: [team] },
  })),
  { key: "SUPER", label: "Super Admin", holder: { level: "SUPER", teams: [] } },
];

/** A box ticked or unticked away from the default, in amber. */
const AWAY_FROM_DEFAULT =
  "[&>input]:border-warning-dot [&>input:checked]:border-warning-dot [&>input:checked]:bg-warning-dot";

/** One team's box on a team rule: amber while it differs from the default, as the admin ticks. */
function TeamBox({
  permission,
  team,
  checked,
  label,
}: {
  permission: Permission;
  team: AdminTeam;
  checked: boolean;
  label: string;
}) {
  const byDefault = defaultTeamsOf(permission).includes(team);
  const [ticked, setTicked] = useState(checked);
  return (
    <Checkbox
      name={ruleField(permission)}
      value={team}
      checked={ticked}
      onChange={(event) => setTicked(event.currentTarget.checked)}
      className={ticked === byDefault ? undefined : AWAY_FROM_DEFAULT}
      aria-label={`${label}${byDefault ? " (on by default)" : " (off by default)"}`}
    />
  );
}

/**
 * "What Each Team Can Do": every permission in plain words, grouped by the
 * part of Manage it opens (`PERMISSION_GROUPS`, so the list is always the
 * whole of them), the view-only ones marked, each team and SUPER across
 * the top. A team rule's boxes are SUPER's to tick, amber where they
 * differ from the defaults: Save keeps the grid, Reset puts every rule
 * back as the code ships it. The other rows' boxes are fixed (SUPER only,
 * every admin, or whoever holds a Settings card) and read from the rules
 * themselves (`may`). Drawn as the wall has it when on; while it is off,
 * it says so, since every admin then has every team's ticks.
 */
export function TeamAccessCard({
  wallActive,
  overrides,
}: {
  wallActive: boolean;
  overrides: RuleOverrides;
}) {
  const { pending, error, formProps } = useActionForm(setAccessRulesAction, {
    done: "Team access saved.",
  });
  const policy = { wallActive: true, overrides };
  const anyChanged = TEAM_PERMISSIONS.some((p) => overrides[p]);

  return (
    <Card flush>
      <form {...formProps}>
        <CardTitle
          inset
          meta={
            wallActive
              ? undefined
              : "With the wall off, every admin has every team's ticks"
          }
          description={
            <>
              Tick which teams hold each permission.{" "}
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 rounded-sm bg-warning-dot"
                />
                Not the default.
              </span>
            </>
          }
          action={
            <div className="flex items-center gap-2">
              {anyChanged ? (
                <Button
                  type="submit"
                  name="reset"
                  value="on"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                >
                  Reset to Defaults
                </Button>
              ) : null}
              <Button type="submit" size="sm" pending={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          }
        >
          What Each Team Can Do
        </CardTitle>
        {TEAM_PERMISSIONS.map((permission) => (
          <input
            key={permission}
            type="hidden"
            name={SHOWN_RULES_FIELD}
            value={permission}
          />
        ))}
        {error ? (
          <div className="px-5 pt-3">
            <FormError error={error} />
          </div>
        ) : null}
        <Table bare>
          <THead>
            <Th>
              <span className="sr-only">Permission</span>
            </Th>
            {COLUMNS.map((column) => (
              <Th key={column.key}>
                <span className="block text-center">{column.label}</span>
              </Th>
            ))}
          </THead>
          {PERMISSION_GROUPS.map((group) => (
            <TBody key={group.label}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={COLUMNS.length + 1}
                  className="bg-hairline px-3.5 py-2 text-left text-caps font-semibold text-muted"
                >
                  {group.label}
                </th>
              </tr>
              {group.permissions.map((permission) => {
                const words = PERMISSION_LABELS[permission];
                const editable = TEAM_PERMISSIONS.includes(permission);
                return (
                  <tr key={permission}>
                    <Td className="min-w-56 font-medium text-ink">
                      {words}
                      {VIEW_ONLY_PERMISSIONS.includes(permission) ? (
                        <span className="ml-2 text-caption font-normal text-muted">
                          View Only
                        </span>
                      ) : null}
                    </Td>
                    {COLUMNS.map((column) => (
                      <Td key={column.key}>
                        <span className="flex justify-center">
                          {editable && column.key !== "SUPER" ? (
                            <TeamBox
                              permission={permission}
                              team={column.key}
                              checked={teamsOf(permission, overrides).includes(
                                column.key,
                              )}
                              label={`${column.label}: ${words}`}
                            />
                          ) : (
                            <Checkbox
                              disabled
                              checked={may(column.holder, permission, policy)}
                              readOnly
                              aria-label={`${column.label}: ${words} (fixed)`}
                            />
                          )}
                        </span>
                      </Td>
                    ))}
                  </tr>
                );
              })}
            </TBody>
          ))}
        </Table>
      </form>
    </Card>
  );
}
