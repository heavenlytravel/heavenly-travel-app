/**
 * Whether the apps send email: the website's, the console's and
 * Connect's. Off since 2026-11-02, until the emails are worked on again:
 * @repo/email logs each one's key and sends none, and every screen that
 * would say "we emailed you" says what happens instead. Browser-safe, so
 * the screens read it too. Clerk's own sign-in codes are not ours and
 * still go out.
 */
export const EMAILS_ON = false;
