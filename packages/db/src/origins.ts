import "server-only";

/**
 * Where each app is served, with no trailing slash, from the environment
 * with the production addresses as defaults. Links in emails, a page's
 * canonical address, and the admin's calls and links to the customer site
 * are built from these.
 */

function origin(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\/+$/, "");
}

/** The customer site. */
export const SITE_URL = origin(
  process.env.SITE_URL,
  "https://new.heavenlytravel.my",
);

/** The admin console. */
export const ADMIN_URL = origin(
  process.env.ADMIN_URL,
  "https://manage.heavenlytravel.my",
);
