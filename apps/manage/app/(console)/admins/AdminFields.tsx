import {
  ADMIN_LEVELS,
  ADMIN_TEAM_LABELS,
  ADMIN_TEAMS,
  adminLevelOf,
  type AdminTeam,
} from "@repo/db";
import { Checkbox, Field } from "@repo/ui/field";
import { Select } from "@repo/ui/select";

/**
 * The level and the teams of one admin, shared by the promote form and the
 * edit panel. The server action reads them as `level` and `teams`.
 */
export function AdminFields({
  level = "REGULAR",
  teams = [],
}: {
  level?: string;
  teams?: readonly AdminTeam[];
}) {
  return (
    <>
      <Field label="Level" className="w-36">
        <Select
          name="level"
          defaultValue={adminLevelOf(level)}
          options={ADMIN_LEVELS.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-800">
          Teams
        </legend>
        <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2">
          {ADMIN_TEAMS.map((team) => (
            <label key={team} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="teams"
                value={team}
                defaultChecked={teams.includes(team)}
              />
              {ADMIN_TEAM_LABELS[team]}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
