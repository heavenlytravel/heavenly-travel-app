import type { EmailSender } from "./types";

/**
 * Resend over its HTTP API. One call, one endpoint; the official SDK would
 * add React Email and its rendering stack for nothing we use.
 * https://resend.com/docs/api-reference/emails/send-email
 */

const ENDPOINT = "https://api.resend.com/emails";

export function resendSender(apiKey: string, from: string): EmailSender {
  return {
    name: "resend",
    async send(message, idempotencyKey) {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Resend ${response.status}: ${detail || response.statusText}`,
        );
      }
    },
  };
}
