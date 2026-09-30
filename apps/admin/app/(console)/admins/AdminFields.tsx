import {
  ADMIN_LEVELS,
  ADMIN_TEAM_LABELS,
  ADMIN_TEAMS,
  adminLevelOf,
  type AdminTeam,
} from "@repo/db";
import { Field, Select } from "@repo/ui/field";

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
        <Select name="level" defaultValue={adminLevelOf(level)}>
          {ADMIN_LEVELS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-neutral-800">
          Teams
        </legend>
        <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2">
          {ADMIN_TEAMS.map((team) => (
            <label key={team} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="teams"
                value={team}
                defaultChecked={teams.includes(team)}
                className="size-4 accent-neutral-900"
              />
              {ADMIN_TEAM_LABELS[team]}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
