import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bookingEmails } from "../src/booking-emails";
import { sampleCases, sampleSettings } from "../src/fixtures";
import { escapeHtml } from "../src/render";

/**
 * Renders every booking email to packages/email/preview/ so the design can
 * be checked in a browser: `pnpm --filter @repo/email preview`, then open
 * preview/index.html. The folder is ignored by git.
 */

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "preview",
);

const settings = { ...sampleSettings, subjectPrefix: "[Development] " };

async function main() {
  await mkdir(outDir, { recursive: true });
  const entries: { file: string; title: string }[] = [];

  for (const { name, event, booking } of sampleCases) {
    for (const { message } of bookingEmails(event, booking, settings)) {
      const audience = message.to === settings.opsTo ? "ops" : "customer";
      const file = `${name}-${audience}.html`;
      await writeFile(path.join(outDir, file), message.html);
      await writeFile(
        path.join(outDir, file.replace(/\.html$/, ".txt")),
        message.text,
      );
      entries.push({ file, title: `${message.subject} (to ${audience})` });
    }
  }

  const index = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Email previews</title>
<style>body{font-family:sans-serif;margin:0;display:grid;grid-template-columns:280px 1fr;height:100vh}nav{border-right:1px solid #ddd;overflow:auto;padding:16px}nav a{display:block;padding:6px 0;color:#073c36}iframe{border:0;width:100%;height:100%}</style>
</head><body><nav><h2>Booking emails</h2>${entries
    .map(
      (e) =>
        `<a href="${e.file}" target="view">${escapeHtml(e.title)}</a> <small><a href="${e.file.replace(/\.html$/, ".txt")}" target="view">text</a></small>`,
    )
    .join(
      "",
    )}</nav><iframe name="view" src="${entries[0]?.file ?? ""}"></iframe></body></html>`;
  await writeFile(path.join(outDir, "index.html"), index);

  console.log(`${entries.length} emails written to ${outDir}`);
  console.log(`Open ${path.join(outDir, "index.html")} in a browser.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
