import type { EmailSender } from "./types";

/**
 * The sender when no Resend key is configured: local development and
 * previews. Prints what would have gone out, text body only, so the flow
 * can be followed in the terminal.
 */
export const logSender: EmailSender = {
  name: "log",
  async send(message, idempotencyKey) {
    console.info(
      [
        `[email] to: ${message.to}`,
        `[email] subject: ${message.subject}`,
        `[email] key: ${idempotencyKey}`,
        message.text,
      ].join("\n"),
    );
  },
};
