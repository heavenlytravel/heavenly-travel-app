// Runs a command with DATABASE_URL swapped for DATABASE_URL_PRODUCTION from
// packages/db/.env, after an explicit confirmation. Used by the *:prod scripts
// so the development URL never has to be edited by hand for a release.
//
// With --protect, every script that writes:
// 1. runs the command first against a throwaway Neon branch copied from
//    production this second, and stops there if it fails;
// 2. after the confirmation, copies production into a backup branch right
//    before the real run, and keeps only the newest backups;
// 3. deletes the throwaway branch at the end either way.
// Both branch names carry the PR of the current git branch, or its name.
import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import {
  createBackupBranch,
  createConnectedBranch,
  deleteBranch,
  type Branch,
} from "./neon-branch";

const CONFIRM_WORD = "production";
const PROTECT_FLAG = "--protect";
const BACKUP_PREFIX = "backup-";
const BACKUPS_KEPT = 3;

const args = process.argv.slice(2);
const protect = args[0] === PROTECT_FLAG;
const command = protect ? args.slice(1) : args;
if (command.length === 0) {
  console.error(
    `Usage: with-production-db [${PROTECT_FLAG}] <command> [...args]`,
  );
  process.exit(1);
}

const productionUrl = process.env.DATABASE_URL_PRODUCTION ?? "";
if (!productionUrl) {
  console.error("DATABASE_URL_PRODUCTION is not set in packages/db/.env");
  process.exit(1);
}
if (productionUrl === process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL_PRODUCTION is identical to DATABASE_URL. Check packages/db/.env.",
  );
  process.exit(1);
}
const productionHost = new URL(productionUrl).host;

let rehearsal: Branch | undefined;
let commandRunning = false;

// Ctrl+C during the command stops the command, and this script then cleans
// up. Ctrl+C anywhere else stops this script, after deleting the rehearsal.
process.on("SIGINT", () => {
  if (commandRunning) return;
  void (rehearsal ? deleteBranch(rehearsal) : Promise.resolve()).finally(() =>
    process.exit(130),
  );
});

function run(databaseUrl: string): Promise<number> {
  commandRunning = true;
  return new Promise<number>((resolve) => {
    const child = spawn(command.join(" "), {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    child.on("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.on("exit", (code) => resolve(code ?? 1));
  }).finally(() => {
    commandRunning = false;
  });
}

async function confirmProduction(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const abort = new AbortController();
  rl.on("SIGINT", () => abort.abort());
  try {
    const answer = await rl.question(
      `${question}\nType "${CONFIRM_WORD}" to continue: `,
      { signal: abort.signal },
    );
    return answer.trim() === CONFIRM_WORD;
  } catch {
    return false;
  } finally {
    rl.close();
  }
}

/** `pr55` for the current git branch's PR, else the branch's name. */
function changeLabel() {
  const output = (line: string) =>
    spawnSync(line, {
      shell: true,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15_000,
    }).stdout?.trim() ?? "";
  const pr = output("gh pr view --json number -q .number");
  if (/^\d+$/.test(pr)) return `pr${pr}`;
  const branch = output("git branch --show-current")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return branch || "local";
}

async function main(): Promise<number> {
  const described = `"${command.join(" ")}"`;

  if (!protect) {
    const confirmed = await confirmProduction(
      `\nAbout to run ${described} against PRODUCTION (${productionHost}).`,
    );
    if (!confirmed) {
      console.error("Aborted.");
      return 1;
    }
    return run(productionUrl);
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const suffix = `${changeLabel()}-${stamp}`;
  const name = `rehearsal-${suffix}`;
  console.log(
    `\nCopying production (${productionHost}) into the Neon branch "${name}"...`,
  );
  const connected = await createConnectedBranch(productionUrl, name);
  rehearsal = connected;
  try {
    console.log(`Rehearsing ${described} on "${name}".\n`);
    const rehearsed = await run(connected.url);
    if (rehearsed !== 0) {
      console.error(
        `\nThe rehearsal failed (exit code ${rehearsed}). Production was not touched.`,
      );
      return rehearsed;
    }
    const confirmed = await confirmProduction(
      `\nThe rehearsal passed. "${name}" stays in the Neon console until you answer.\n` +
        `About to run ${described} against PRODUCTION (${productionHost}).`,
    );
    if (!confirmed) {
      console.error("Aborted. Production was not touched.");
      return 1;
    }
    const backup = await createBackupBranch(
      productionUrl,
      `${BACKUP_PREFIX}${suffix}`,
      BACKUP_PREFIX,
      BACKUPS_KEPT,
    );
    console.log(`Backed up production to the Neon branch "${backup.name}".\n`);
    return await run(productionUrl);
  } finally {
    await deleteBranch(connected);
    rehearsal = undefined;
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
