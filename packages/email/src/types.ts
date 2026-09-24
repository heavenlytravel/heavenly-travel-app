/** One email, ready to send. Both bodies are always present. */
export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Where an email goes: Resend when a key exists, the console otherwise. */
export type EmailSender = {
  name: string;
  /**
   * Delivers one message. `idempotencyKey` names the send, so a retried
   * request cannot deliver the same email twice. Throws on failure; the
   * caller logs it.
   */
  send(message: EmailMessage, idempotencyKey: string): Promise<void>;
};
