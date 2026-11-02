"use client";

import {
  ADMIN_TEAMS,
  ADMIN_TEAM_LABELS,
  PERMISSION_LABELS,
  PERMISSIONS,
  TEAM_PERMISSIONS,
  defaultTeamsOf,
  may,
  ruleField,
  teamsOf,
  type Permission,
  type PermissionHolder,
  type RuleOverrides,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { CheckIcon } from "@repo/ui/icons";
import { Card, CardTitle } from "@repo/console/Card";
import { TBody, Td, Th, THead, Table } from "@repo/console/Table";
import { useActionForm } from "@repo/console/use-action-form";
import { setAccessRulesAction } from "./actions";

/** The table's columns: each team as the wall sees it, alone, then SUPER. */
const COLUMNS: readonly {
  key: string;
  label: string;
  holder: PermissionHolder;
}[] = [
  ...ADMIN_TEAMS.map((team) => ({
    key: team,
    label: ADMIN_TEAM_LABELS[team],
    holder: { level: "REGULAR", teams: [team] },
  })),
  { key: "SUPER", label: "Super admin", holder: { level: "SUPER", teams: [] } },
];

const isTeamRule = (permission: Permission) =>
  TEAM_PERMISSIONS.includes(permission);

/**
 * "What each team can do": every permission in plain words down the side
 * (`PERMISSION_LABELS`, so the list is always the whole of them), each
 * team and SUPER across the top. A team rule's boxes are SUPER's to tick:
 * Save keeps the grid, Reset puts every rule back as the code ships it.
 * The other rows are fixed, SUPER only, every admin, or whoever holds a
 * Settings card, and show a tick read from the rules themselves (`may`).
 * Drawn as the wall has it when on; while it is off, it says so, since
 * every admin then has every team's ticks.
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
  const changed = TEAM_PERMISSIONS.filter(
    (permission) => overrides[permission],
  );

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
          description={`Tick which teams hold each permission; the rows without boxes are fixed. ${
            changed.length > 0
              ? `${changed.length} changed from the defaults, marked "Changed".`
              : "Every permission is as it ships."
          }`}
          action={
            <div className="flex items-center gap-2">
              {changed.length > 0 ? (
                <Button
                  type="submit"
                  name="reset"
                  value="on"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                >
                  Reset to defaults
                </Button>
              ) : null}
              <Button type="submit" size="sm" pending={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          }
        >
          What each team can do
        </CardTitle>
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
          <TBody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <Td className="min-w-56 font-medium text-ink">
                  {PERMISSION_LABELS[permission]}
                  {overrides[permission] ? (
                    <span className="ml-2 text-caption font-normal text-muted">
                      Changed
                    </span>
                  ) : null}
                </Td>
                {COLUMNS.map((column) => (
                  <Td key={column.key} className="text-center">
                    {isTeamRule(permission) && column.key !== "SUPER" ? (
                      <Checkbox
                        name={ruleField(permission)}
                        value={column.key}
                        defaultChecked={teamsOf(permission, overrides).some(
                          (team) => team === column.key,
                        )}
                        aria-label={`${column.label}: ${PERMISSION_LABELS[permission]}${
                          defaultTeamsOf(permission).some(
                            (team) => team === column.key,
                          )
                            ? " (on by default)"
                            : ""
                        }`}
                      />
                    ) : may(column.holder, permission, policy) ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-white">
                        <CheckIcon className="size-3" aria-hidden="true" />
                        <span className="sr-only">Yes</span>
                      </span>
                    ) : (
                      <span className="text-muted">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">No</span>
                      </span>
                    )}
                  </Td>
                ))}
              </tr>
            ))}
          </TBody>
        </Table>
      </form>
    </Card>
  );
}
