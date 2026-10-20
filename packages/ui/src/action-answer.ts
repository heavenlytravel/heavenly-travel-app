import { unstable_rethrow } from "next/navigation";

/** What a screen says when a server action does not answer: the network dropped, or the server failed. */
export const UNANSWERED_MESSAGE =
  "That did not go through. Check your connection and try again.";

/**
 * A server action called from the browser: its answer, or a refusal
 * saying `UNANSWERED_MESSAGE` when the call itself failed, so the screen
 * says what to do instead of showing the error page. Next's own signals,
 * a redirect, pass through.
 */
export async function answerOf<T>(
  call: Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await call;
  } catch (error) {
    unstable_rethrow(error);
    return { error: UNANSWERED_MESSAGE };
  }
}
