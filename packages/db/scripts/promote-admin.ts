// Usage: pnpm --filter @repo/db db:promote-admin <email> [SUPER|REGULAR] [team ...]
// A REGULAR admin needs at least one team: OPERATION, RESERVATION, SALES or
// FINANCE. Runs against the DATABASE_URL in packages/db/.env. The user must
// have signed in at least once so their User row exists.
import {
  ADMIN_LEVELS,
  ADMIN_TEAMS,
  isAdminLevel,
  isAdminTeam,
} from "../src/roles";
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { setAdmin } from "../src/admins";
import { db } from "../src/client";

const [email, levelArg = "SUPER", ...teamArgs] = process.argv.slice(2);

if (!email || !isAdminLevel(levelArg) || !teamArgs.every(isAdminTeam)) {
  console.error(
    `Usage: db:promote-admin <email> [${ADMIN_LEVELS.join("|")}] [${ADMIN_TEAMS.join("|")} ...]`,
  );
  process.exit(1);
}

// Run by the developer at a terminal, so the log names the system.
const result = await setAdmin(SYSTEM_ACTOR, email, levelArg, teamArgs);
await db.$disconnect();

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
console.log(
  `${email} is now an admin (${[levelArg, ...teamArgs].join(", ")}).`,
);
