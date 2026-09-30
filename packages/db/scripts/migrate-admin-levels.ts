// Usage: pnpm --filter @repo/db db:migrate-admin-levels
// Run once after the schema push that adds `AdminProfile.teams`. The OPS level
// was the Operation team under another name, so each OPS admin becomes
// REGULAR in the team OPERATION. Other rows are left alone, so running it
// again changes nothing.
import { adminTeamsOf } from "../src/roles";
import { db } from "../src/client";

const REMOVED_LEVEL = "OPS";

const admins = await db.adminProfile.findMany({
  where: { level: REMOVED_LEVEL },
  include: { user: true },
});

for (const admin of admins) {
  const teams = adminTeamsOf([...admin.teams, "OPERATION"]);
  await db.adminProfile.update({
    where: { id: admin.id },
    data: { level: "REGULAR", teams },
  });
  console.log(`${admin.user.email}: REGULAR (${teams.join(", ")})`);
}
await db.$disconnect();

console.log(
  admins.length === 0
    ? `No ${REMOVED_LEVEL} admins. Nothing to change.`
    : `Moved ${admins.length} admin(s) from ${REMOVED_LEVEL}.`,
);
