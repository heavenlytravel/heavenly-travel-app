// Runs a command with DATABASE_URL swapped for DATABASE_URL_PRODUCTION from
// packages/db/.env, after an explicit confirmation. Used by the *:prod scripts
// so the development URL never has to be edited by hand for a release.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const CONFIRM_WORD = "production";

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error("Usage: with-production-db <command> [...args]");
  process.exit(1);
}

const url = process.env.DATABASE_URL_PRODUCTION;
if (!url) {
  console.error("DATABASE_URL_PRODUCTION is not set in packages/db/.env");
  process.exit(1);
}
if (url === process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL_PRODUCTION is identical to DATABASE_URL. Check packages/db/.env.",
  );
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  `\nAbout to run "${command.join(" ")}" against PRODUCTION (${new URL(url).host}).\n` +
    `Type "${CONFIRM_WORD}" to continue: `,
);
rl.close();

if (answer.trim() !== CONFIRM_WORD) {
  console.error("Aborted.");
  process.exit(1);
}

const result = spawnSync(command.join(" "), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(result.status ?? 1);
