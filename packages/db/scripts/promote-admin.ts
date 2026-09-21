// Usage: pnpm --filter @repo/db db:promote-admin <email> [SUPER|REGULAR|OPS]
// Runs against the DATABASE_URL in packages/db/.env. The user must have
// signed in at least once so their User row exists.
import { ADMIN_LEVELS, isAdminLevel } from "../src/roles";
import { setAdminLevel } from "../src/admins";
import { db } from "../src/client";

const [email, levelArg = "SUPER"] = process.argv.slice(2);

if (!email || !isAdminLevel(levelArg)) {
  console.error(`Usage: db:promote-admin <email> [${ADMIN_LEVELS.join("|")}]`);
  process.exit(1);
}

const result = await setAdminLevel(email, levelArg);
await db.$disconnect();

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
console.log(`${email} is now an admin (${levelArg}).`);
