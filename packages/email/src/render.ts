import { CONTACT, type DetailRow } from "@repo/db";

/**
 * An email described once and rendered twice: HTML for mail clients and
 * plain text for everything else. Templates build blocks; they never touch
 * markup, so the two bodies cannot drift apart.
 */

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "rows"; title: string | null; rows: DetailRow[] }
  | { type: "button"; label: string; href: string }
  | { type: "contact" };

export type EmailContent = {
  subject: string;
  heading: string;
  blocks: Block[];
};

const BRAND = "Heavenly Travel";
const GREEN = "#073c36";
const MUTED = "#5b6b68";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valueHtml(value: DetailRow[1]) {
  if (typeof value === "string") return escapeHtml(value);
  if (value.address === value.label) return escapeHtml(value.label);
  return `${escapeHtml(value.label)}<br><span style="color:${MUTED};font-size:13px">${escapeHtml(value.address)}</span>`;
}

function valueText(value: DetailRow[1]) {
  if (typeof value === "string") return value;
  if (value.address === value.label) return value.label;
  return `${value.label}\n    ${value.address}`;
}

function blockHtml(block: Block): string {
  switch (block.type) {
    case "paragraph":
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(block.text)}</p>`;
    case "rows": {
      const title = block.title
        ? `<p style="margin:24px 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${GREEN}">${escapeHtml(block.title)}</p>`
        : "";
      const rows = block.rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 12px 6px 0;color:${MUTED};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;vertical-align:top">${valueHtml(value)}</td></tr>`,
        )
        .join("");
      return `${title}<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.4;margin:0 0 16px">${rows}</table>`;
    }
    case "button":
      return `<p style="margin:24px 0"><a href="${escapeHtml(block.href)}" style="display:inline-block;background:${GREEN};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${escapeHtml(block.label)}</a></p>`;
    case "contact":
      return `<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:${MUTED}">Questions? <a href="${escapeHtml(CONTACT.whatsappHref)}" style="color:${GREEN}">WhatsApp us on ${escapeHtml(CONTACT.whatsappNumber)}</a> or reply to this email.</p>`;
  }
}

function blockText(block: Block): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "rows": {
      const rows = block.rows
        .map(([label, value]) => `${label}: ${valueText(value)}`)
        .join("\n");
      return block.title ? `${block.title.toUpperCase()}\n${rows}` : rows;
    }
    case "button":
      return `${block.label}: ${block.href}`;
    case "contact":
      return `Questions? WhatsApp us on ${CONTACT.whatsappNumber} (${CONTACT.whatsappHref}) or reply to this email.`;
  }
}

export function renderHtml(content: EmailContent) {
  const body = content.blocks.map(blockHtml).join("\n");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f6f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#10201d">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:${GREEN}">${BRAND}</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${escapeHtml(content.heading)}</h1>
${body}
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:${MUTED}">${BRAND} &middot; ${escapeHtml(CONTACT.bookingEmail)}</p>
</td></tr></table>
</body>
</html>`;
}

export function renderText(content: EmailContent) {
  return [
    BRAND.toUpperCase(),
    content.heading,
    ...content.blocks.map(blockText),
    `${BRAND} - ${CONTACT.bookingEmail}`,
  ].join("\n\n");
}
