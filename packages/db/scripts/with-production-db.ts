// Runs a command with DATABASE_URL swapped for DATABASE_URL_PRODUCTION from
// packages/db/.env, after an explicit confirmation. Used by the *:prod scripts
// so the development URL never has to be edited by hand for a release.
//
// With --rehearse, the command first runs against a throwaway Neon branch
// copied from production this second. Production is offered only when that
// run succeeds, and the branch is deleted at the end either way.
import "dotenv/config";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { createBranchFrom, deleteBranch, type Branch } from "./neon-branch";

const CONFIRM_WORD = "production";
const REHEARSE_FLAG = "--rehearse";

const args = process.argv.slice(2);
const rehearse = args[0] === REHEARSE_FLAG;
const command = rehearse ? args.slice(1) : args;
if (command.length === 0) {
  console.error(
    `Usage: with-production-db [${REHEARSE_FLAG}] <command> [...args]`,
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
// up. Ctrl+C anywhere else stops this script, after deleting the branch.
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

async function main(): Promise<number> {
  const described = `"${command.join(" ")}"`;

  if (!rehearse) {
    const confirmed = await confirmProduction(
      `\nAbout to run ${described} against PRODUCTION (${productionHost}).`,
    );
    if (!confirmed) {
      console.error("Aborted.");
      return 1;
    }
    return run(productionUrl);
  }

  const name = `rehearsal-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
  console.log(
    `\nCopying production (${productionHost}) into the Neon branch "${name}"...`,
  );
  rehearsal = await createBranchFrom(productionUrl, name);
  try {
    console.log(`Rehearsing ${described} on "${name}".\n`);
    const rehearsed = await run(rehearsal.url);
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
    return await run(productionUrl);
  } finally {
    await deleteBranch(rehearsal);
    rehearsal = undefined;
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
