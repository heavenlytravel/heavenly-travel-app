import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";

/**
 * While a SUPER views Connect as someone, nothing may be written for them:
 * the writers' gates in ./access.ts answer null then. This checks every
 * server action and every API route asks one, so an action added later
 * cannot skip it. See docs/261112-connect-view-as.md.
 */

const APP = join(import.meta.dirname, "..");

/** The gates, and the staff actions' own, which asks `getMemberAccess`. */
const GATES = [
  "getDriverAccess(",
  "getMemberAccess(",
  "getRegistrantAccess(",
  "ownerOf(",
];

/** Exports that write nothing for a vendor or driver, and why. */
const UNGATED: Record<string, string> = {
  // Checks the registration's fields; stores nothing.
  checkRegistrationAction: "reads only",
  // The view's own start and end: SUPER is checked on the real session.
  startViewAsAction: "view-as",
  exitViewAsAction: "view-as",
};

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

/** Each exported function's name and its text up to the next export. */
function exportedFunctions(source: string) {
  const starts = [...source.matchAll(/^export (?:async )?function (\w+)/gm)];
  return starts.map((match, index) => ({
    name: match[1]!,
    body: source.slice(match.index, starts[index + 1]?.index),
  }));
}

const writers = filesUnder(APP).filter((path) => {
  const source = readFileSync(path, "utf8");
  return (
    /^"use server";/m.test(source) ||
    relative(APP, path).split(sep)[0] === "api"
  );
});

describe("Connect's writers while viewing as someone", () => {
  it("finds the action files and the routes", () => {
    assert.ok(writers.length >= 8, `found ${writers.length}`);
  });

  for (const path of writers) {
    const source = readFileSync(path, "utf8");
    for (const { name, body } of exportedFunctions(source)) {
      it(`${relative(APP, path)}: ${name} asks a gate`, () => {
        if (name in UNGATED) return;
        assert.ok(
          GATES.some((gate) => body.includes(gate)),
          `${name} writes without asking getDriverAccess, getMemberAccess or getRegistrantAccess`,
        );
      });
    }
  }
});
