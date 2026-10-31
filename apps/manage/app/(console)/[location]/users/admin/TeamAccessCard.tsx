import {
  ADMIN_TEAMS,
  ADMIN_TEAM_LABELS,
  PERMISSIONS,
  may,
  type Permission,
  type PermissionHolder,
} from "@repo/db";
import { CheckIcon } from "@repo/ui/icons";
import { Card, CardTitle } from "@repo/console/Card";
import { TBody, Td, Th, THead, Table } from "@repo/console/Table";

/** Each permission in the words of what it opens, as the table's rows name them. */
const PERMISSION_WORDS: Record<Permission, string> = {
  "dashboard.view": "See the dashboard",
  "bookings.view": "See bookings",
  "bookings.manage": "Confirm, amend and cancel bookings",
  "bookings.create": "Enter a booking and change a price",
  "bookings.fulfil":
    "Assign vehicles and drivers, and report a trip's steps for its driver",
  "bookings.notes": "Write notes on a booking",
  "coverage.manage":
    "Change zones, classes on sale, rates and the class catalogue",
  "coverage.view": "See coverage, classes and rates",
  "fleet.manage": "Vendors, vehicles and drivers",
  "vendors.review": "Approve, refuse and suspend vendors",
  "locations.view": "Open a location",
  "locations.manage": "A location's details and saved addresses",
  "locations.create": "Add a location",
  "pages.manage": "Write and publish a location's pages",
  "website.manage": "The website's own pages, its footer and top choices",
  "locations.activate": "Take a location live, pause or delete it",
  "settings.view": "Open Settings",
  "admins.manage": "Admin, their levels and teams",
  "users.manage": "All Users: every account, its email and password",
  "wall.switch": "Switch the wall",
  "activity.view": "See the activity of their own work",
  "media.manage": "Media",
};

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

/**
 * "What each team can do": every permission in plain words down the side,
 * each team and SUPER across the top, and a tick where the wall lets them,
 * read from the rules themselves (`may` of @repo/db) so it never drifts
 * from them. Drawn as the wall has it when on; while it is off, it says
 * so, since every admin then has every team's ticks.
 */
export function TeamAccessCard({ wallActive }: { wallActive: boolean }) {
  return (
    <Card flush>
      <CardTitle
        inset
        meta={
          wallActive
            ? undefined
            : "With the wall off, every admin has every team's ticks"
        }
      >
        What each team can do
      </CardTitle>
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
                {PERMISSION_WORDS[permission]}
              </Td>
              {COLUMNS.map((column) => (
                <Td key={column.key} className="text-center">
                  {may(column.holder, permission, true) ? (
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
    </Card>
  );
}
