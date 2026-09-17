// Usage: pnpm --filter @repo/db db:promote-admin <email> [SUPER|REGULAR|OPS]
// Runs against the DATABASE_URL in packages/db/.env. The user must have
// signed in at least once so their User row exists.
import { ADMIN_LEVELS, isAdminLevel } from "../src/roles";
import { db } from "../src/client";

const [email, levelArg = "SUPER"] = process.argv.slice(2);

if (!email || !isAdminLevel(levelArg)) {
  console.error(`Usage: db:promote-admin <email> [${ADMIN_LEVELS.join("|")}]`);
  process.exit(1);
}

const user = await db.user.findUnique({ where: { email } });
if (!user) {
  console.error(`No user with email ${email}. They must sign in once first.`);
  process.exit(1);
}

await db.adminProfile.upsert({
  where: { userId: user.id },
  update: { level: levelArg },
  create: { userId: user.id, level: levelArg },
});
console.log(`${email} is now an admin (${levelArg}).`);
await db.$disconnect();
